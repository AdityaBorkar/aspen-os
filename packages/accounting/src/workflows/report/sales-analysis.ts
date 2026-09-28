import { accountingSalesInvoice } from "#/db-schemas/sales";
import { OverdueQuerySchema } from "#/schemas/payment";
import { parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export const salesAnalysis = Workflow.name("accounting.report.sales-analysis")
  .input(OverdueQuerySchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const rows = await ctx.db.select().from(accountingSalesInvoice);
      return rows.map((row) => ({
        customerId: row.customer_id,
        grandTotal: parseMoney(row.grand_total),
        invoiceId: row.id,
        postingDate: row.posting_date,
        status: row.status,
      }));
    }),
  );
