import { accountingAccount, accountingGlEntry } from "#/db-schemas/chart";
import { StatementFiltersSchema } from "#/schemas/reports";
import { parseMoney, roundMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const balanceSheet = Workflow.name("accounting.report.balance-sheet")
  .input(StatementFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.fiscalYear) {
        conditions.push(eq(accountingGlEntry.fiscal_year, input.fiscalYear));
      }
      if (input.toDate) {
        conditions.push(lte(accountingGlEntry.posting_date, input.toDate));
      }
      if (input.fromDate) {
        conditions.push(gte(accountingGlEntry.posting_date, input.fromDate));
      }
      const entries = await ctx.db
        .select()
        .from(accountingGlEntry)
        .where(and(...conditions));
      const accounts = await ctx.db.select().from(accountingAccount);
      const typeOf = new Map(accounts.map((account) => [account.id, account.root_type]));
      let assets = 0;
      let liabilities = 0;
      let equity = 0;
      for (const entry of entries) {
        const root = typeOf.get(entry.account_id);
        const net = roundMoney(parseMoney(entry.debit) - parseMoney(entry.credit));
        if (root === "asset") {
          assets = roundMoney(assets + net);
        } else if (root === "liability") {
          liabilities = roundMoney(liabilities - net);
        } else if (root === "equity") {
          equity = roundMoney(equity - net);
        }
      }
      return {
        assets,
        balanced: Math.abs(assets - (liabilities + equity)) < 1,
        equity,
        liabilities,
      };
    }),
  );
