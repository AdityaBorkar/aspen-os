import { accountingAccount, accountingGlEntry } from "#/db-schemas/chart";
import { StatementFiltersSchema } from "#/schemas/reports";
import { parseMoney, roundMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const trialBalance = Workflow.name("accounting.report.trial-balance")
  .input(StatementFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.fiscalYear) {
        conditions.push(eq(accountingGlEntry.fiscal_year, input.fiscalYear));
      }
      if (input.fromDate) {
        conditions.push(gte(accountingGlEntry.posting_date, input.fromDate));
      }
      if (input.toDate) {
        conditions.push(lte(accountingGlEntry.posting_date, input.toDate));
      }
      if (input.accountId) {
        conditions.push(eq(accountingGlEntry.account_id, input.accountId));
      }
      const entries = await ctx.db
        .select()
        .from(accountingGlEntry)
        .where(and(...conditions));
      const accounts = await ctx.db.select().from(accountingAccount);
      const byAccount = new Map<
        string,
        { accountId: string; accountName: string; credit: number; debit: number; rootType: string }
      >();
      for (const account of accounts) {
        byAccount.set(account.id, {
          accountId: account.id,
          accountName: account.name,
          credit: 0,
          debit: 0,
          rootType: account.root_type,
        });
      }
      for (const entry of entries) {
        const slot = byAccount.get(entry.account_id) ?? {
          accountId: entry.account_id,
          accountName: entry.account_id,
          credit: 0,
          debit: 0,
          rootType: "unknown",
        };
        slot.debit = roundMoney(slot.debit + parseMoney(entry.debit));
        slot.credit = roundMoney(slot.credit + parseMoney(entry.credit));
        byAccount.set(entry.account_id, slot);
      }
      const rows = [...byAccount.values()].filter((row) => row.debit !== 0 || row.credit !== 0);
      let totalDebit = 0;
      let totalCredit = 0;
      for (const row of rows) {
        totalDebit = roundMoney(totalDebit + row.debit);
        totalCredit = roundMoney(totalCredit + row.credit);
      }
      return { rows, totalCredit, totalDebit };
    }),
  );
