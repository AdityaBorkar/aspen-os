import { productsAttribute } from "#/db-schemas";
import { ListAttributesSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listAttributes = Workflow.name("products.attribute.list")
  .input(ListAttributesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.filters?.isDisabled !== undefined) {
        conditions.push(eq(productsAttribute.is_disabled, input.filters.isDisabled));
      }
      if (input.filters?.isNumeric !== undefined) {
        conditions.push(eq(productsAttribute.is_numeric, input.filters.isNumeric));
      }
      if (input.filters?.search) {
        conditions.push(ilike(productsAttribute.name, `%${input.filters.search}%`));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await ctx.db
        .select()
        .from(productsAttribute)
        .where(where)
        .orderBy(productsAttribute.name);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? rows.length;
      return rows.slice(offset, offset + limit);
    }),
  );
