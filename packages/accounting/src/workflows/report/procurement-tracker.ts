import { accountingPurchaseOrder } from "#/db-schemas/purchase";
import { OverdueQuerySchema } from "#/schemas/payment";
import { parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export const procurementTracker = Workflow.name("accounting.report.procurement-tracker")
  .input(OverdueQuerySchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const orders = await ctx.db.select().from(accountingPurchaseOrder);
      return orders.map((order) => ({
        billedPercent: parseMoney(order.billed_percent),
        orderId: order.id,
        receivedPercent: parseMoney(order.received_percent),
        status: order.status,
        supplierId: order.supplier_id,
      }));
    }),
  );
