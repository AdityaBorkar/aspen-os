import { productsPriceList } from "#/db-schemas";
import type { ProductsItemPrice } from "#/db-schemas/item-price";
import type { ProductsPriceList } from "#/db-schemas/price-list";
import { GetActiveForItemSchema } from "#/schemas";
import {
  fetchEligibleItem,
  isValidOn,
  loadActiveRowsForItem,
  toDateKey,
  todayKey,
} from "#/services/price-fetch-service";

import { Workflow } from "@aspen-os/platform/server";

export const getActiveForItem = Workflow.name("products.price-fetch.get-active-for-item")
  .input(GetActiveForItemSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      await fetchEligibleItem(ctx.db, input.itemId, input.side ?? null);
      const dateKey =
        input.txnDate === null || input.txnDate === undefined
          ? todayKey()
          : toDateKey(input.txnDate);
      const [rows, lists] = await Promise.all([
        loadActiveRowsForItem(ctx.db, input.itemId),
        ctx.db.select().from(productsPriceList),
      ]);
      const listsById = new Map<string, ProductsPriceList>();
      for (const list of lists) {
        listsById.set(list.id, list);
      }
      const out: ProductsItemPrice[] = [];
      for (const row of rows) {
        const list = listsById.get(row.price_list_id);
        if (list === undefined || !list.is_enabled) {
          continue;
        }
        if (!isValidOn(row, dateKey)) {
          continue;
        }
        if (input.side === "selling") {
          if (row.supplier_id !== null) {
            continue;
          }
          if (list.applicability !== "selling" && list.applicability !== "both") {
            continue;
          }
        }
        if (input.side === "buying") {
          if (row.customer_id !== null) {
            continue;
          }
          if (list.applicability !== "buying" && list.applicability !== "both") {
            continue;
          }
        }
        out.push(row);
      }
      out.sort((first, second) => {
        if (first.price_list_id !== second.price_list_id) {
          return first.price_list_id < second.price_list_id ? -1 : 1;
        }
        if (first.uom !== second.uom) {
          return first.uom < second.uom ? -1 : 1;
        }
        if (first.valid_from !== second.valid_from) {
          return first.valid_from < second.valid_from ? -1 : 1;
        }
        return 0;
      });
      return out;
    }),
  );
