import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { AgingQuerySchema } from "#/schemas/payment";
import { parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { gt } from "drizzle-orm";

export const apAging = Workflow.name("accounting.report.ap-aging")
  .input(AgingQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      void input;
      const rows = await ctx.db
        .select()
        .from(accountingPurchaseInvoice)
        .where(gt(accountingPurchaseInvoice.outstanding_amount, "0"));
      return rows.map((row) => ({
        invoiceId: row.id,
        outstanding: parseMoney(row.outstanding_amount),
        status: row.status,
        supplierId: row.supplier_id,
      }));
    }),
  );
