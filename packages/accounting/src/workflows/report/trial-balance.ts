import { accountingAccount } from "#/db-schemas/chart";
import { StatementFiltersSchema } from "#/schemas/reports";
import { fetchGlEntries } from "#/services/gl-queries";
import { parseMoney, roundMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export interface TrialBalanceRow {
  accountId: string;
  accountName: string;
  credit: number;
  debit: number;
  rootType: string;
}

export const trialBalance = Workflow.name("accounting.report.trial-balance")
  .input(StatementFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const entries = await fetchGlEntries(ctx.db, input);
      if (entries.length === 0) {
        return { rows: [], totalCredit: 0, totalDebit: 0 };
      }
      const accounts = await ctx.db.select().from(accountingAccount);
      const meta = new Map(accounts.map((account) => [account.id, account]));
      const byAccount = new Map<string, TrialBalanceRow>();
      for (const entry of entries) {
        let slot = byAccount.get(entry.account_id);
        if (!slot) {
          const account = meta.get(entry.account_id);
          slot = {
            accountId: entry.account_id,
            accountName: account?.name ?? entry.account_id,
            credit: 0,
            debit: 0,
            rootType: account?.root_type ?? "unknown",
          };
          byAccount.set(entry.account_id, slot);
        }
        slot.debit = roundMoney(slot.debit + parseMoney(entry.debit));
        slot.credit = roundMoney(slot.credit + parseMoney(entry.credit));
      }
      const rows = [...byAccount.values()];
      let totalDebit = 0;
      let totalCredit = 0;
      for (const row of rows) {
        totalDebit = roundMoney(totalDebit + row.debit);
        totalCredit = roundMoney(totalCredit + row.credit);
      }
      return { rows, totalCredit, totalDebit };
    }),
  );
