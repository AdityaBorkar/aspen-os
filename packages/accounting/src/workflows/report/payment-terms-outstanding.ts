import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { OverdueQuerySchema } from "#/schemas/payment";
import { parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { gt } from "drizzle-orm";

export const paymentTermsOutstanding = Workflow.name("accounting.report.payment-terms-outstanding")
  .input(OverdueQuerySchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const [sales, purchases] = await Promise.all([
        ctx.db
          .select()
          .from(accountingSalesInvoice)
          .where(gt(accountingSalesInvoice.outstanding_amount, "0")),
        ctx.db
          .select()
          .from(accountingPurchaseInvoice)
          .where(gt(accountingPurchaseInvoice.outstanding_amount, "0")),
      ]);
      return {
        payables: purchases.map((row) => ({
          dueDate: row.due_date,
          invoiceId: row.id,
          outstanding: parseMoney(row.outstanding_amount),
          supplierId: row.supplier_id,
        })),
        receivables: sales.map((row) => ({
          customerId: row.customer_id,
          dueDate: row.due_date,
          invoiceId: row.id,
          outstanding: parseMoney(row.outstanding_amount),
        })),
      };
    }),
  );
