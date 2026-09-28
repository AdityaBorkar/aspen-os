import { accountingSalesInvoice } from "#/db-schemas/sales";
import { AgingQuerySchema } from "#/schemas/payment";
import { parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { gt } from "drizzle-orm";

export const arAging = Workflow.name("accounting.report.ar-aging")
  .input(AgingQuerySchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const rows = await ctx.db
        .select()
        .from(accountingSalesInvoice)
        .where(gt(accountingSalesInvoice.outstanding_amount, "0"));
      return rows.map((row) => ({
        customerId: row.customer_id,
        dueDate: row.due_date,
        grandTotal: parseMoney(row.grand_total),
        invoiceId: row.id,
        outstanding: parseMoney(row.outstanding_amount),
        status: row.status,
      }));
    }),
  );
