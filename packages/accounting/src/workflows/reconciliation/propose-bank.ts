import { accountingBankStatementLine, accountingPaymentEntry } from "#/db-schemas/payment";
import { parseMoney } from "#/utils/money";

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
      const proposals: { paymentId: string; statementLineId: string }[] = [];
      for (const line of lines) {
        for (const payment of payments) {
          const sameAmount =
            Math.abs(parseMoney(line.amount) - parseMoney(payment.paid_amount)) < 0.005;
          const sameRef =
            !line.reference_no ||
            !payment.reference_no ||
            line.reference_no === payment.reference_no;
          const sameAccount =
            payment.paid_from === line.bank_account || payment.paid_to === line.bank_account;
          if (sameAmount && sameRef && sameAccount) {
            proposals.push({ paymentId: payment.id, statementLineId: line.id });
            break;
          }
        }
      }
      return proposals;
    }),
  );
