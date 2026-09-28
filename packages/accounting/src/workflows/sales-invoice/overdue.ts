import { accountingSalesInvoice } from "#/db-schemas/sales";
import { OverdueQuerySchema } from "#/schemas/payment";
import { isOverdue } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const getOverdueSalesInvoices = Workflow.name("accounting.sales-invoice.overdue")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.partyId) {
        conditions.push(eq(accountingSalesInvoice.customer_id, input.partyId));
      }
      const rows = await ctx.db
        .select()
        .from(accountingSalesInvoice)
        .where(and(...conditions));
      return rows.filter(
        (row) =>
          row.status !== "draft" &&
          row.status !== "cancelled" &&
          row.status !== "paid" &&
          Number(row.outstanding_amount) > 0 &&
          isOverdue(row.due_date),
      );
    }),
  );
