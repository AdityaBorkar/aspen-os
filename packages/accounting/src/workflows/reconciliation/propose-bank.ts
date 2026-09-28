import { accountingBankStatementLine, accountingPaymentEntry } from "#/db-schemas/payment";
import { GL_TOLERANCE, parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const proposeBankMatches = Workflow.name("accounting.reconciliation.propose-bank")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const lines = await ctx.db
        .select()
        .from(accountingBankStatementLine)
        .where(eq(accountingBankStatementLine.match_status, "unmatched"));
      const payments = await ctx.db
        .select()
        .from(accountingPaymentEntry)
        .where(eq(accountingPaymentEntry.status, "submitted"));
      const byAccount = new Map<string, typeof payments>();
      for (const payment of payments) {
        for (const account of [payment.paid_from, payment.paid_to]) {
          if (!account) {
            continue;
          }
          const list = byAccount.get(account) ?? [];
          list.push(payment);
          byAccount.set(account, list);
        }
      }
      const proposals: { paymentId: string; statementLineId: string }[] = [];
      for (const line of lines) {
        const candidates = byAccount.get(line.bank_account) ?? [];
        for (const payment of candidates) {
          const sameAmount =
            Math.abs(parseMoney(line.amount) - parseMoney(payment.paid_amount)) < GL_TOLERANCE;
          const sameRef =
            !line.reference_no ||
            !payment.reference_no ||
            line.reference_no === payment.reference_no;
          if (sameAmount && sameRef) {
            proposals.push({ paymentId: payment.id, statementLineId: line.id });
            break;
          }
        }
      }
      return proposals;
    }),
  );
