import { accountingSalesInvoice } from "#/db-schemas/sales";
import { SalesInvoiceFiltersSchema } from "#/schemas/sales";
import { isOverdue } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listSalesInvoices = Workflow.name("accounting.sales-invoice.list")
  .input(SalesInvoiceFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.customerId) {
        conditions.push(eq(accountingSalesInvoice.customer_id, input.customerId));
      }
      if (input.status) {
        conditions.push(eq(accountingSalesInvoice.status, input.status));
      }
      const rows = await ctx.db
        .select()
        .from(accountingSalesInvoice)
        .where(and(...conditions))
        .orderBy(desc(accountingSalesInvoice.created_at));
      if (input.overdueOnly) {
        return rows.filter((row) => isOverdue(row.due_date) && Number(row.outstanding_amount) > 0);
      }
      return rows;
    }),
  );
