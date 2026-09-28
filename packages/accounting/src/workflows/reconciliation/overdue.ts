import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { OverdueQuerySchema } from "#/schemas/payment";
import { parseMoney, todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, lt, notInArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const getOverdueInvoices = Workflow.name("accounting.reconciliation.overdue")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const asOf = input.asOf ?? todayDateOnly();
      const salesConditions: SQL[] = [
        notInArray(accountingSalesInvoice.status, ["draft", "cancelled", "paid"]),
        gt(accountingSalesInvoice.outstanding_amount, "0"),
        lt(accountingSalesInvoice.due_date, asOf),
      ];
      if (input.partyId) {
        salesConditions.push(eq(accountingSalesInvoice.customer_id, input.partyId));
      }
      const sales = await ctx.db
        .select()
        .from(accountingSalesInvoice)
        .where(and(...salesConditions));

      const purchaseConditions: SQL[] = [
        notInArray(accountingPurchaseInvoice.status, ["draft", "cancelled", "paid"]),
        gt(accountingPurchaseInvoice.outstanding_amount, "0"),
        lt(accountingPurchaseInvoice.due_date, asOf),
      ];
      if (input.partyId) {
        purchaseConditions.push(eq(accountingPurchaseInvoice.supplier_id, input.partyId));
      }
      const purchases = await ctx.db
        .select()
        .from(accountingPurchaseInvoice)
        .where(and(...purchaseConditions));

      return [
        ...sales.map((row) => ({
          dueDate: row.due_date,
          invoiceId: row.id,
          outstanding: parseMoney(row.outstanding_amount),
          partyId: row.customer_id,
          partyType: "customer" as const,
        })),
        ...purchases.map((row) => ({
          dueDate: row.due_date,
          invoiceId: row.id,
          outstanding: parseMoney(row.outstanding_amount),
          partyId: row.supplier_id,
          partyType: "vendor" as const,
        })),
      ];
    }),
  );
