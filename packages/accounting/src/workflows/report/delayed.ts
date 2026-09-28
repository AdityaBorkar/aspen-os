import { accountingPurchaseOrder } from "#/db-schemas/purchase";
import { accountingSalesOrder } from "#/db-schemas/sales";
import { OverdueQuerySchema } from "#/schemas/payment";
import { todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, lt, notInArray } from "drizzle-orm";

export const delayedReceiptDelivery = Workflow.name("accounting.report.delayed")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const asOf = input.asOf ?? todayDateOnly();
      const [sales, purchases] = await Promise.all([
        ctx.db
          .select()
          .from(accountingSalesOrder)
          .where(
            and(
              notInArray(accountingSalesOrder.status, ["completed", "closed", "cancelled"]),
              lt(accountingSalesOrder.delivery_date, asOf),
            ),
          ),
        ctx.db
          .select()
          .from(accountingPurchaseOrder)
          .where(
            and(
              notInArray(accountingPurchaseOrder.status, ["completed", "closed", "cancelled"]),
              lt(accountingPurchaseOrder.required_by, asOf),
            ),
          ),
      ]);
      return {
        delayedPurchases: purchases.map((order) => ({
          orderId: order.id,
          requiredBy: order.required_by,
        })),
        delayedSales: sales.map((order) => ({
          deliveryDate: order.delivery_date,
          orderId: order.id,
        })),
      };
    }),
  );
