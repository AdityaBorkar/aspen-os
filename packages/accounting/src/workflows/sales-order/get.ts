import { accountingSalesOrder, accountingSalesOrderItem } from "#/db-schemas/sales";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getSalesOrder = Workflow.name("accounting.sales-order.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [order] = await ctx.db
      .select()
      .from(accountingSalesOrder)
      .where(eq(accountingSalesOrder.id, id))
      .limit(1);
    if (!order) {
      throw new Error(`Sales order "${id}" not found.`);
    }
    const items = await ctx.db
      .select()
      .from(accountingSalesOrderItem)
      .where(eq(accountingSalesOrderItem.sales_order_id, id));
    return { items, order };
  });
