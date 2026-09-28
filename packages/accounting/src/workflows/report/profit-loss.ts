import { StatementFiltersSchema } from "#/schemas/reports";
import { fetchAccountRootTypes, fetchGlEntries } from "#/services/gl-queries";
import { parseMoney, roundMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export const profitAndLoss = Workflow.name("accounting.report.profit-loss")
  .input(StatementFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const entries = await fetchGlEntries(ctx.db, input);
      const typeOf = await fetchAccountRootTypes(ctx.db);
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
