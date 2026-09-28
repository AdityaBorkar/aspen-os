import {
  accountingPurchaseInvoiceItem,
  accountingPurchaseOrder,
  accountingPurchaseOrderItem,
} from "#/db-schemas/purchase";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, toMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const updateRateFromLastPurchase = Workflow.name("accounting.purchase-order.update-rate")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [order] = await ctx.db
      .select()
      .from(accountingPurchaseOrder)
      .where(eq(accountingPurchaseOrder.id, id))
      .limit(1);
    if (!order) {
      throw new Error(`Purchase order "${id}" not found.`);
    }
    if (order.status !== "draft") {
      throw new Error("Only draft purchase orders can update rates.");
    }
    const items = await ctx.db
      .select()
      .from(accountingPurchaseOrderItem)
      .where(eq(accountingPurchaseOrderItem.purchase_order_id, id));

    for (const item of items) {
      const [last] = await ctx.db
        .select({
          rate: accountingPurchaseInvoiceItem.rate,
        })
        .from(accountingPurchaseInvoiceItem)
        .where(and(eq(accountingPurchaseInvoiceItem.item_id, item.item_id)))
        .orderBy(desc(accountingPurchaseInvoiceItem.created_at))
        .limit(1);
      if (last) {
        const rate = parseMoney(last.rate);
        if (rate > 0) {
          await ctx.db
            .update(accountingPurchaseOrderItem)
            .set({ rate: toMoney(rate) })
            .where(eq(accountingPurchaseOrderItem.id, item.id));
        }
      }
    }

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PURCHASE_ORDER,
        newState: { ratesRefreshed: true },
      });
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingPurchaseOrder)
      .where(eq(accountingPurchaseOrder.id, id))
      .limit(1);
    return assertUpdated(updated, `Purchase order "${id}"`);
  });
