import { accountingAccount, accountingGlEntry } from "#/db-schemas/chart";
import { StatementFiltersSchema } from "#/schemas/reports";
import { parseMoney, roundMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const profitAndLoss = Workflow.name("accounting.report.profit-loss")
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
      const entries = await ctx.db
        .select()
        .from(accountingGlEntry)
        .where(and(...conditions));
      const accounts = await ctx.db.select().from(accountingAccount);
      const typeOf = new Map(accounts.map((account) => [account.id, account.root_type]));
      let income = 0;
      let expenses = 0;
      for (const entry of entries) {
        const root = typeOf.get(entry.account_id);
        if (root === "income") {
          income = roundMoney(income + parseMoney(entry.credit) - parseMoney(entry.debit));
        } else if (root === "expense") {
          expenses = roundMoney(expenses + parseMoney(entry.debit) - parseMoney(entry.credit));
        }
      }
      return { expenses, income, profit: roundMoney(income - expenses) };
    }),
  );
