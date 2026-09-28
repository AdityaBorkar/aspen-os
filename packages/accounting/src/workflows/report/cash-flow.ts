import { accountingAccount, accountingGlEntry } from "#/db-schemas/chart";
import { StatementFiltersSchema } from "#/schemas/reports";
import { parseMoney, roundMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const cashFlow = Workflow.name("accounting.report.cash-flow")
  .input(StatementFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const accounts = await ctx.db.select().from(accountingAccount);
      const cashIds = new Set(
        accounts
          .filter((account) => account.account_type === "bank" || account.account_type === "cash")
          .map((account) => account.id),
      );
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
      let inflow = 0;
      let outflow = 0;
      for (const entry of entries) {
        if (!cashIds.has(entry.account_id)) {
          continue;
        }
        inflow = roundMoney(inflow + parseMoney(entry.debit));
        outflow = roundMoney(outflow + parseMoney(entry.credit));
      }
      return { inflow, net: roundMoney(inflow - outflow), outflow };
    }),
  );
