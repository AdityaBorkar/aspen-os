import { accountingPaymentEntry } from "#/db-schemas/payment";
import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { UnallocatedQuerySchema } from "#/schemas/payment";
import { parseMoney, roundMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, gt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const proposeReconciliation = Workflow.name("accounting.reconciliation.propose")
  .input(UnallocatedQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const paymentConditions: SQL[] = [gt(accountingPaymentEntry.unallocated_amount, "0")];
      if (input.partyId) {
        paymentConditions.push(eq(accountingPaymentEntry.party_id, input.partyId));
      }
      if (input.partyType) {
        paymentConditions.push(eq(accountingPaymentEntry.party_type, input.partyType));
      }
      const payments = await ctx.db
        .select()
        .from(accountingPaymentEntry)
        .where(and(...paymentConditions))
        .orderBy(asc(accountingPaymentEntry.posting_date));

      const invoices: { id: string; outstanding: number; partyId: string }[] = [];
      if (!input.partyType || input.partyType === "customer") {
        const salesConditions: SQL[] = [gt(accountingSalesInvoice.outstanding_amount, "0")];
        if (input.partyId) {
          salesConditions.push(eq(accountingSalesInvoice.customer_id, input.partyId));
        }
        const sales = await ctx.db
          .select()
          .from(accountingSalesInvoice)
          .where(and(...salesConditions))
          .orderBy(asc(accountingSalesInvoice.due_date));
        for (const invoice of sales) {
          invoices.push({
            id: invoice.id,
            outstanding: parseMoney(invoice.outstanding_amount),
            partyId: invoice.customer_id,
          });
        }
      }
      if (!input.partyType || input.partyType === "vendor") {
        const purchaseConditions: SQL[] = [gt(accountingPurchaseInvoice.outstanding_amount, "0")];
        if (input.partyId) {
          purchaseConditions.push(eq(accountingPurchaseInvoice.supplier_id, input.partyId));
        }
        const purchases = await ctx.db
          .select()
          .from(accountingPurchaseInvoice)
          .where(and(...purchaseConditions))
          .orderBy(asc(accountingPurchaseInvoice.due_date));
        for (const invoice of purchases) {
          invoices.push({
            id: invoice.id,
            outstanding: parseMoney(invoice.outstanding_amount),
            partyId: invoice.supplier_id,
          });
        }
      }

      const proposals: { invoiceId: string; paymentId: string; proposedAmount: number }[] = [];
      const remaining = new Map<string, number>();
      for (const invoice of invoices) {
        remaining.set(invoice.id, invoice.outstanding);
      }
      for (const payment of payments) {
        let available = parseMoney(payment.unallocated_amount);
        for (const invoice of invoices) {
          if (available <= 0.005) {
            break;
          }
          if (payment.party_id && invoice.partyId !== payment.party_id) {
            continue;
          }
          const left = remaining.get(invoice.id) ?? 0;
          if (left <= 0.005) {
            continue;
          }
          const amount = roundMoney(Math.min(available, left));
          proposals.push({ invoiceId: invoice.id, paymentId: payment.id, proposedAmount: amount });
          remaining.set(invoice.id, roundMoney(left - amount));
          available = roundMoney(available - amount);
        }
      }
      return proposals;
    }),
  );
