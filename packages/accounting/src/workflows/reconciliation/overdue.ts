import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { OverdueQuerySchema } from "#/schemas/payment";
import { isOverdue, parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export const getOverdueInvoices = Workflow.name("accounting.reconciliation.overdue")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const sales = await ctx.db.select().from(accountingSalesInvoice);
      const overdueSales = sales
        .filter(
          (row) =>
            (!input.partyId || row.customer_id === input.partyId) &&
            row.status !== "draft" &&
            row.status !== "cancelled" &&
            row.status !== "paid" &&
            parseMoney(row.outstanding_amount) > 0 &&
            isOverdue(row.due_date),
        )
        .map((row) => ({
          dueDate: row.due_date,
          invoiceId: row.id,
          outstanding: parseMoney(row.outstanding_amount),
          partyId: row.customer_id,
          partyType: "customer" as const,
        }));
      const purchases = await ctx.db.select().from(accountingPurchaseInvoice);
      const overduePurchases = purchases
        .filter(
          (row) =>
            (!input.partyId || row.supplier_id === input.partyId) &&
            row.status !== "draft" &&
            row.status !== "cancelled" &&
            row.status !== "paid" &&
            parseMoney(row.outstanding_amount) > 0 &&
            isOverdue(row.due_date),
        )
        .map((row) => ({
          dueDate: row.due_date,
          invoiceId: row.id,
          outstanding: parseMoney(row.outstanding_amount),
          partyId: row.supplier_id,
          partyType: "vendor" as const,
        }));
      return [...overdueSales, ...overduePurchases];
    }),
  );
