import { accountingPurchaseOrder, accountingPurchaseOrderItem } from "#/db-schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getPurchaseOrder = Workflow.name("accounting.purchase-order.get")
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
    const items = await ctx.db
      .select()
      .from(accountingPurchaseOrderItem)
      .where(eq(accountingPurchaseOrderItem.purchase_order_id, id));
    return { items, order };
  });
