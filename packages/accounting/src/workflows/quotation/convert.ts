import {
  accountingQuotation,
  accountingQuotationItem,
  accountingSalesOrder,
  accountingSalesOrderItem,
} from "#/db-schemas/sales";
import { QUOTATION_EVENTS, SALES_ORDER_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const convertQuotation = Workflow.name("accounting.quotation.convert")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [quotation] = await ctx.db
      .select()
      .from(accountingQuotation)
      .where(eq(accountingQuotation.id, id))
      .limit(1);
    if (!quotation) {
      throw new Error(`Quotation "${id}" not found.`);
    }
    if (quotation.status !== "submitted") {
      throw new Error("Only submitted quotations can be converted.");
    }

    const items = await ctx.db
      .select()
      .from(accountingQuotationItem)
      .where(eq(accountingQuotationItem.quotation_id, id));

    const [order] = await ctx.db
      .insert(accountingSalesOrder)
      .values({
        billed_percent: "0",
        currency: quotation.currency,
        customer_id: quotation.party_id,
        delivered_percent: "0",
        grand_total: quotation.grand_total,
        net_total: quotation.net_total,
        quotation_id: id,
        status: "draft",
        tax_template_id: quotation.tax_template_id,
        tax_total: quotation.tax_total,
        terms_text: quotation.terms_text,
        warehouse_id: null,
      })
      .returning();

    if (!order) {
      throw new Error("Failed to convert quotation.");
    }

    if (items.length > 0) {
      await ctx.db.insert(accountingSalesOrderItem).values(
        items.map((item) => ({
          amount: item.amount,
          billed_qty: "0",
          delivered_qty: "0",
          discount_amount: item.discount_amount,
          discount_percent: item.discount_percent,
          income_account: null,
          item_id: item.item_id,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          sales_order_id: order.id,
          uom: item.uom,
          uom_factor: item.uom_factor,
          warehouse_id: item.warehouse_id,
        })),
      );
    }

    await ctx.db
      .update(accountingQuotation)
      .set({ status: "ordered", updated_at: new Date() })
      .where(eq(accountingQuotation.id, id));

    const converted = assertUpdated(order, "Sales order");

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.QUOTATION,
        newState: { status: "ordered" },
      });
      await ctx.pubsub.publish(QUOTATION_EVENTS.CANCELLED, { quotationId: id });
      await ctx.pubsub.publish(SALES_ORDER_EVENTS.CREATED, { salesOrderId: converted.id });
    });

    return converted;
  });
