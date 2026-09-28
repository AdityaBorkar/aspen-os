import { accountingAccount } from "#/db-schemas/chart";
import { StatementFiltersSchema } from "#/schemas/reports";
import { fetchGlEntries } from "#/services/gl-queries";
import { parseMoney, roundMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

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
      const entries = await fetchGlEntries(ctx.db, input);
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
