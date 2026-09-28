import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { OverdueQuerySchema } from "#/schemas/payment";
import { parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export const purchaseAnalysis = Workflow.name("accounting.report.purchase-analysis")
  .input(OverdueQuerySchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const rows = await ctx.db.select().from(accountingPurchaseInvoice);
      return rows.map((row) => ({
        grandTotal: parseMoney(row.grand_total),
        invoiceId: row.id,
        postingDate: row.posting_date,
        status: row.status,
        supplierId: row.supplier_id,
      }));
    }),
  );
