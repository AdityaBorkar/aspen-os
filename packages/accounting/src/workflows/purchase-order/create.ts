import { accountingPurchaseOrder, accountingPurchaseOrderItem } from "#/db-schemas/purchase";
import { PURCHASE_ORDER_EVENTS } from "#/pubsub";
import { CreatePurchaseOrderSchema } from "#/schemas/purchase";
import { computeDocumentTotals, lineAmount } from "#/services/totals-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreatePurchaseOrderSchema });

export const createPurchaseOrder = Workflow.name("accounting.purchase-order.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePurchaseOrderSchema, input);

    const totals = await computeDocumentTotals({
      db: ctx.db,
      lines: parsed.items.map((item) => ({
        discountAmount: item.discountAmount ?? 0,
        discountPercent: item.discountPercent ?? 0,
        itemTaxTemplateId: item.itemTaxTemplateId ?? null,
        qty: item.qty ?? 1,
        rate: item.rate ?? 0,
      })),
      taxTemplateId: parsed.taxTemplateId ?? null,
    });

    const [order] = await ctx.db
      .insert(accountingPurchaseOrder)
      .values({
        billed_percent: "0",
        currency: "INR",
        file_id: parsed.fileId ?? null,
        grand_total: toMoney(totals.grandTotal),
        material_request_id: parsed.materialRequestId ?? null,
        net_total: toMoney(totals.netTotal),
        payment_terms_template_id: parsed.paymentTermsTemplateId ?? null,
        received_percent: "0",
        required_by: parsed.requiredBy ?? null,
        status: "draft",
        supplier_id: parsed.supplierId,
        supplier_quotation_id: parsed.supplierQuotationId ?? null,
        tax_template_id: parsed.taxTemplateId ?? null,
        tax_total: toMoney(totals.taxTotal),
        terms_text: parsed.termsText ?? null,
      })
      .returning();

    if (!order) {
      throw new Error("Failed to create purchase order.");
    }

    await ctx.db.insert(accountingPurchaseOrderItem).values(
      parsed.items.map((item) => ({
        amount: toMoney(roundMoney(lineAmount(item))),
        billed_qty: "0",
        discount_amount: toMoney(item.discountAmount ?? 0),
        discount_percent: toMoney(item.discountPercent ?? 0),
        expense_account: item.expenseAccount ?? null,
        item_id: item.itemId,
        item_name: item.itemName ?? null,
        item_tax_template_id: item.itemTaxTemplateId ?? null,
        purchase_order_id: order.id,
        qty: toMoney(item.qty ?? 1),
        rate: toMoney(item.rate ?? 0),
        received_qty: "0",
        required_by: parsed.requiredBy ?? null,
        uom: item.uom ?? null,
        uom_factor: toMoney(item.uomFactor ?? 1),
        warehouse_id: item.warehouseId ?? null,
      })),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { status: order.status, supplierId: order.supplier_id },
      });
      await ctx.pubsub.publish(PURCHASE_ORDER_EVENTS.CREATED, { purchaseOrderId: order.id });
    });

    return order;
  });
