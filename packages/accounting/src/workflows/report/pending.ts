import { accountingPurchaseOrder } from "#/db-schemas/purchase";
import { accountingSalesOrder } from "#/db-schemas/sales";
import { OverdueQuerySchema } from "#/schemas/payment";
import { parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export const pendingDeliveryBilling = Workflow.name("accounting.report.pending")
  .input(OverdueQuerySchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const [sales, purchases] = await Promise.all([
        ctx.db.select().from(accountingSalesOrder),
        ctx.db.select().from(accountingPurchaseOrder),
      ]);
      const pendingSales = sales
        .filter(
          (order) =>
            parseMoney(order.delivered_percent) < 100 || parseMoney(order.billed_percent) < 100,
        )
        .map((order) => ({
          billedPercent: parseMoney(order.billed_percent),
          deliveredPercent: parseMoney(order.delivered_percent),
          orderId: order.id,
        }));
      const pendingPurchases = purchases
        .filter(
          (order) =>
            parseMoney(order.received_percent) < 100 || parseMoney(order.billed_percent) < 100,
        )
        .map((order) => ({
          billedPercent: parseMoney(order.billed_percent),
          orderId: order.id,
          receivedPercent: parseMoney(order.received_percent),
        }));
      return { pendingPurchases, pendingSales };
    }),
  );
