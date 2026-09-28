import { productsAttribute } from "#/db-schemas";
import { ListAttributesSchema } from "#/schemas";
import { checkPage } from "#/workflows/utils";

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
      checkPage(input);
      let query = ctx.db
        .select()
        .from(productsAttribute)
        .where(where)
        .orderBy(productsAttribute.name)
        .$dynamic();
      if (input.limit !== undefined) {
        query = query.limit(input.limit);
      }
      if (input.offset !== undefined) {
        query = query.offset(input.offset);
      }
      return query;
    }),
  );
