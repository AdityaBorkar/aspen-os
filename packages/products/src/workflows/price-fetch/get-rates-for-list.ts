import { productsItemPrice } from "#/db-schemas";
import { GetRatesForListSchema } from "#/schemas";
import { toDateKey, todayKey } from "#/services/pricing-dates";
import { fetchPriceListStep } from "#/workflow-steps/fetch";
import { checkPage } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const getRatesForList = Workflow.name("products.price-fetch.get-rates-for-list")
  .input(GetRatesForListSchema)
  .handler(async (input, ctx) => {
    const list = await ctx.step.run(fetchPriceListStep, { id: input.priceListId });
    if (!list.is_enabled) {
      return [];
    }
    return ctx.step.run("query", async () => {
      checkPage(input);
      const dateKey =
        input.txnDate === null || input.txnDate === undefined
          ? todayKey()
          : toDateKey(input.txnDate);
      // SAFETY: or() with two defined branches always yields SQL; no undefined input by construction.
      const openEnded = or(
        isNull(productsItemPrice.valid_upto),
        gte(productsItemPrice.valid_upto, dateKey),
      ) as SQL;
      let query = ctx.db
        .select()
        .from(productsItemPrice)
        .where(
          and(
            eq(productsItemPrice.price_list_id, input.priceListId),
            eq(productsItemPrice.status, "active"),
            lte(productsItemPrice.valid_from, dateKey),
            openEnded,
          ),
        )
        .orderBy(productsItemPrice.item_id, productsItemPrice.uom, productsItemPrice.valid_from)
        .$dynamic();
      if (input.limit !== undefined) {
        query = query.limit(input.limit);
      }
      if (input.offset !== undefined) {
        query = query.offset(input.offset);
      }
      return query;
    });
  });
