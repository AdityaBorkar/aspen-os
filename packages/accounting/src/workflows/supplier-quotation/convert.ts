import {
  accountingPurchaseOrder,
  accountingPurchaseOrderItem,
  accountingSupplierQuotation,
  accountingSupplierQuotationItem,
} from "#/db-schemas/purchase";
import { PURCHASE_ORDER_EVENTS, SUPPLIER_QUOTATION_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const convertSupplierQuotation = Workflow.name("accounting.supplier-quotation.convert")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [quotation] = await ctx.db
      .select()
      .from(accountingSupplierQuotation)
      .where(eq(accountingSupplierQuotation.id, id))
      .limit(1);
    if (!quotation) {
      throw new Error(`Supplier quotation "${id}" not found.`);
    }
    if (quotation.status !== "draft" && quotation.status !== "submitted") {
      throw new Error("Only draft or submitted supplier quotations can be converted.");
    }

    const items = await ctx.db
      .select()
      .from(accountingSupplierQuotationItem)
      .where(eq(accountingSupplierQuotationItem.supplier_quotation_id, id));

    let orderId = "";
    await ctx.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(accountingPurchaseOrder)
        .values({
          billed_percent: "0",
          currency: "INR",
          grand_total: quotation.grand_total,
          net_total: quotation.net_total,
          received_percent: "0",
          required_by: null,
          status: "draft",
          supplier_id: quotation.supplier_id,
          supplier_quotation_id: id,
          tax_template_id: quotation.tax_template_id,
          tax_total: quotation.tax_total,
        })
        .returning();
      if (!order) {
        throw new Error("Failed to convert supplier quotation.");
      }
      orderId = order.id;

      if (items.length > 0) {
        await tx.insert(accountingPurchaseOrderItem).values(
          items.map((item) => ({
            amount: item.amount,
            billed_qty: "0",
            discount_amount: "0",
            discount_percent: "0",
            expense_account: null,
            item_id: item.item_id,
            item_name: null,
            purchase_order_id: order.id,
            qty: item.qty,
            rate: item.rate,
            received_qty: "0",
            required_by: null,
            uom: null,
            uom_factor: "1",
            warehouse_id: null,
          })),
        );
      }
    });

    const [order] = await ctx.db
      .select()
      .from(accountingPurchaseOrder)
      .where(eq(accountingPurchaseOrder.id, orderId))
      .limit(1);
    const converted = assertUpdated(order, "Purchase order");

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: converted.id,
        entityType: AUDIT_ENTITY_TYPE.SUPPLIER_QUOTATION,
        newState: { supplierId: converted.supplier_id },
      });
      await ctx.pubsub.publish(SUPPLIER_QUOTATION_EVENTS.CONVERTED, {
        purchaseOrderId: converted.id,
        supplierQuotationId: id,
      });
      await ctx.pubsub.publish(PURCHASE_ORDER_EVENTS.CREATED, { purchaseOrderId: converted.id });
    });

    return converted;
  });
