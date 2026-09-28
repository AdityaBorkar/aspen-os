import { productsItemPrice, productsPriceList } from "#/db-schemas";
import type { ProductsPriceList } from "#/db-schemas/price-list";
import { GetActiveForItemSchema } from "#/schemas";
import { fetchEligibleItem } from "#/services/item-eligibility";
import { toDateKey, todayKey } from "#/services/pricing-dates";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const getActiveForItem = Workflow.name("products.price-fetch.get-active-for-item")
  .input(GetActiveForItemSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      await fetchEligibleItem(ctx.db, input.itemId, input.side ?? null);
      const dateKey =
        input.txnDate === null || input.txnDate === undefined
          ? todayKey()
          : toDateKey(input.txnDate);
      const lists = await ctx.db.select().from(productsPriceList);
      const listsById = new Map<string, ProductsPriceList>();
      for (const list of lists) {
        listsById.set(list.id, list);
      }
      const allowedListIds = lists
        .filter((list) => {
          if (!list.is_enabled) {
            return false;
          }
          if (input.side === "selling") {
            return list.applicability === "selling" || list.applicability === "both";
          }
          if (input.side === "buying") {
            return list.applicability === "buying" || list.applicability === "both";
          }
          return true;
        })
        .map((list) => list.id);
      if (allowedListIds.length === 0) {
        return [];
      }
      const conditions: SQL[] = [
        eq(productsItemPrice.item_id, input.itemId),
        eq(productsItemPrice.status, "active"),
        inArray(productsItemPrice.price_list_id, allowedListIds),
        lte(productsItemPrice.valid_from, dateKey),
        // SAFETY: or() with two defined branches always yields SQL; no undefined input by construction.
        or(isNull(productsItemPrice.valid_upto), gte(productsItemPrice.valid_upto, dateKey)) as SQL,
      ];
      // A selling lookup never matches supplier-specific rows and vice versa.
      if (input.side === "selling") {
        conditions.push(isNull(productsItemPrice.supplier_id));
      }
      if (input.side === "buying") {
        conditions.push(isNull(productsItemPrice.customer_id));
      }
      return ctx.db
        .select()
        .from(productsItemPrice)
        .where(and(...conditions))
        .orderBy(
          productsItemPrice.price_list_id,
          productsItemPrice.uom,
          productsItemPrice.valid_from,
        );
    }),
  );
