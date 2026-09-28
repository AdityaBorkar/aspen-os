import { accountingSalesOrder, accountingSalesOrderItem } from "#/db-schemas/sales";
import { SALES_ORDER_EVENTS } from "#/pubsub";
import { UpdateSalesOrderItemsSchema } from "#/schemas/sales";
import { computeDocumentTotals, lineAmount } from "#/services/totals-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const InputSchema = object({ id: string(), items: UpdateSalesOrderItemsSchema });

export const updateSalesOrderItems = Workflow.name("accounting.sales-order.update-items")
  .input(InputSchema)
  .handler(async ({ id, items }, ctx) => {
    const parsed = parse(UpdateSalesOrderItemsSchema, items);

    const [existing] = await ctx.db
      .select()
      .from(accountingSalesOrder)
      .where(eq(accountingSalesOrder.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Sales order "${id}" not found.`);
    }
    if (
      existing.status === "completed" ||
      existing.status === "closed" ||
      existing.status === "cancelled"
    ) {
      throw new Error("Completed, closed, or cancelled orders cannot be edited.");
    }

    const currentItems = await ctx.db
      .select()
      .from(accountingSalesOrderItem)
      .where(eq(accountingSalesOrderItem.sales_order_id, id));

    for (const current of currentItems) {
      const delivered = Number(current.delivered_qty ?? 0);
      const billed = Number(current.billed_qty ?? 0);
      if (delivered > 0 || billed > 0) {
        throw new Error("Order lines with delivered or billed quantity cannot be updated.");
      }
    }

    const totals = await computeDocumentTotals({
      db: ctx.db,
      lines: parsed.items.map((item) => ({
        discountAmount: item.discountAmount ?? 0,
        discountPercent: item.discountPercent ?? 0,
        itemTaxTemplateId: item.itemTaxTemplateId ?? null,
        qty: item.qty ?? 1,
        rate: item.rate ?? 0,
      })),
      taxTemplateId: existing.tax_template_id,
    });

    await ctx.db
      .delete(accountingSalesOrderItem)
      .where(eq(accountingSalesOrderItem.sales_order_id, id));
    await ctx.db.insert(accountingSalesOrderItem).values(
      parsed.items.map((item) => ({
        amount: toMoney(roundMoney(lineAmount(item))),
        billed_qty: "0",
        delivered_qty: "0",
        discount_amount: toMoney(item.discountAmount ?? 0),
        discount_percent: toMoney(item.discountPercent ?? 0),
        income_account: item.incomeAccount ?? null,
        item_id: item.itemId,
        item_name: item.itemName ?? null,
        item_tax_template_id: item.itemTaxTemplateId ?? null,
        qty: toMoney(item.qty ?? 1),
        rate: toMoney(item.rate ?? 0),
        sales_order_id: id,
        uom: item.uom ?? null,
        uom_factor: toMoney(item.uomFactor ?? 1),
        warehouse_id: item.warehouseId ?? null,
      })),
    );

    await ctx.db
      .update(accountingSalesOrder)
      .set({
        grand_total: toMoney(totals.grandTotal),
        net_total: toMoney(totals.netTotal),
        tax_total: toMoney(totals.taxTotal),
        updated_at: new Date(),
      })
      .where(eq(accountingSalesOrder.id, id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { grandTotal: totals.grandTotal },
      });
      await ctx.pubsub.publish(SALES_ORDER_EVENTS.UPDATED, { salesOrderId: id });
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingSalesOrder)
      .where(eq(accountingSalesOrder.id, id))
      .limit(1);
    return updated;
  });
