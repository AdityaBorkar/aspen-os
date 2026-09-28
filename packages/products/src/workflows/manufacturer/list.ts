import { productsManufacturer } from "#/db-schemas";
import { ListManufacturersSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listManufacturers = Workflow.name("products.manufacturer.list")
  .input(ListManufacturersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.filters?.isDisabled !== undefined) {
        conditions.push(eq(productsManufacturer.is_disabled, input.filters.isDisabled));
      }
      if (input.filters?.search) {
        const term = `%${input.filters.search}%`;
        // SAFETY: or() with two defined ilike() branches always yields SQL; no undefined input by construction.
        conditions.push(
          or(
            ilike(productsManufacturer.name, term),
            ilike(productsManufacturer.website, term),
          ) as SQL,
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await ctx.db
        .select()
        .from(productsManufacturer)
        .where(where)
        .orderBy(productsManufacturer.name);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? rows.length;
      return rows.slice(offset, offset + limit);
    }),
  );
