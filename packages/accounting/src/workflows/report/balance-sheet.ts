import { StatementFiltersSchema } from "#/schemas/reports";
import {
  fetchAccountRootTypes,
  fetchGlEntries,
  isBalanceSheetBalanced,
} from "#/services/gl-queries";
import { parseMoney, roundMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export const balanceSheet = Workflow.name("accounting.report.balance-sheet")
  .input(StatementFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const entries = await fetchGlEntries(ctx.db, input);
      const typeOf = await fetchAccountRootTypes(ctx.db);
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
        balanced: isBalanceSheetBalanced(assets, liabilities, equity),
        equity,
        liabilities,
      };
    }),
  );
