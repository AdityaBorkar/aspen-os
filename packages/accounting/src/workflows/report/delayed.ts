import { accountingPurchaseOrder } from "#/db-schemas/purchase";
import { accountingSalesOrder } from "#/db-schemas/sales";
import { OverdueQuerySchema } from "#/schemas/payment";
import { todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export const delayedReceiptDelivery = Workflow.name("accounting.report.delayed")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const asOf = input.asOf ?? todayDateOnly();
      const sales = await ctx.db.select().from(accountingSalesOrder);
      const delayedSales = sales
        .filter(
          (order) =>
            order.delivery_date &&
            order.delivery_date < asOf &&
            order.status !== "completed" &&
            order.status !== "closed",
        )
        .map((order) => ({ deliveryDate: order.delivery_date, orderId: order.id }));
      const purchases = await ctx.db.select().from(accountingPurchaseOrder);
      const delayedPurchases = purchases
        .filter(
          (order) =>
            order.required_by &&
            order.required_by < asOf &&
            order.status !== "completed" &&
            order.status !== "closed",
        )
        .map((order) => ({ orderId: order.id, requiredBy: order.required_by }));
      return { delayedPurchases, delayedSales };
    }),
  );
