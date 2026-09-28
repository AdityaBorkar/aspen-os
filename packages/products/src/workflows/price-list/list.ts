import { productsPriceList } from "#/db-schemas";
import { ListPriceListsSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listPriceLists = Workflow.name("products.price-list.list")
  .input(ListPriceListsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      const { filters } = input;
      if (filters?.applicability !== undefined) {
        conditions.push(eq(productsPriceList.applicability, filters.applicability));
      }
      if (filters?.isEnabled !== undefined) {
        conditions.push(eq(productsPriceList.is_enabled, filters.isEnabled));
      }
      if (filters?.search) {
        const term = `%${filters.search}%`;
        // SAFETY: or() with two defined ilike() branches always yields SQL; no undefined input by construction.
        conditions.push(
          or(ilike(productsPriceList.name, term), ilike(productsPriceList.territory, term)) as SQL,
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await ctx.db
        .select()
        .from(productsPriceList)
        .where(where)
        .orderBy(productsPriceList.name);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? rows.length;
      return rows.slice(offset, offset + limit);
    }),
  );
