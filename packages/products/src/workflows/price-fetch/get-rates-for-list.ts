import { GetRatesForListSchema } from "#/schemas";
import {
  isValidOn,
  loadActiveRowsForList,
  toDateKey,
  todayKey,
} from "#/services/price-fetch-service";
import { fetchPriceListStep } from "#/workflow-steps/fetch-price-list";

import { Workflow } from "@aspen-os/platform/server";

export const getRatesForList = Workflow.name("products.price-fetch.get-rates-for-list")
  .input(GetRatesForListSchema)
  .handler(async (input, ctx) => {
    const list = await ctx.step.run(fetchPriceListStep, { id: input.priceListId });
    if (!list.is_enabled) {
      return [];
    }
    return ctx.step.run("query", async () => {
      const dateKey =
        input.txnDate === null || input.txnDate === undefined
          ? todayKey()
          : toDateKey(input.txnDate);
      const rows = await loadActiveRowsForList(ctx.db, input.priceListId);
      const valid = rows.filter((row) => isValidOn(row, dateKey));
      valid.sort((first, second) => {
        if (first.item_id !== second.item_id) {
          return first.item_id < second.item_id ? -1 : 1;
        }
        if (first.uom !== second.uom) {
          return first.uom < second.uom ? -1 : 1;
        }
        if (first.valid_from !== second.valid_from) {
          return first.valid_from < second.valid_from ? -1 : 1;
        }
        return 0;
      });
      const offset = input.offset ?? 0;
      const limit = input.limit ?? valid.length;
      return valid.slice(offset, offset + limit);
    });
  });
