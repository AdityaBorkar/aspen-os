import { productsBrand } from "#/db-schemas";
import { ListBrandsSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listBrands = Workflow.name("products.brand.list")
  .input(ListBrandsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      const { filters } = input;
      if (filters?.isDisabled !== undefined) {
        conditions.push(eq(productsBrand.is_disabled, filters.isDisabled));
      }
      if (filters?.search) {
        const term = `%${filters.search}%`;
        // SAFETY: or() with two defined ilike() branches always yields SQL; no undefined input by construction.
        conditions.push(
          or(ilike(productsBrand.name, term), ilike(productsBrand.description, term)) as SQL,
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await ctx.db
        .select()
        .from(productsBrand)
        .where(where)
        .orderBy(productsBrand.name);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? rows.length;
      return rows.slice(offset, offset + limit);
    }),
  );
