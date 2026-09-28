import { accountingSalesOrder } from "#/db-schemas/sales";
import { SalesOrderFiltersSchema } from "#/schemas/sales";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listSalesOrders = Workflow.name("accounting.sales-order.list")
  .input(SalesOrderFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.customerId) {
        conditions.push(eq(accountingSalesOrder.customer_id, input.customerId));
      }
      if (input.status) {
        conditions.push(eq(accountingSalesOrder.status, input.status));
      }
      return ctx.db
        .select()
        .from(accountingSalesOrder)
        .where(and(...conditions))
        .orderBy(desc(accountingSalesOrder.created_at));
    }),
  );
