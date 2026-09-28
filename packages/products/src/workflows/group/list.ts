import { productsItemGroup } from "#/db-schemas";
import { ListGroupsSchema } from "#/schemas";
import { checkPage } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listGroups = Workflow.name("products.group.list")
  .input(ListGroupsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.filters?.isDisabled !== undefined) {
        conditions.push(eq(productsItemGroup.is_disabled, input.filters.isDisabled));
      }
      if (input.filters?.isGroup !== undefined) {
        conditions.push(eq(productsItemGroup.is_group, input.filters.isGroup));
      }
      if (input.filters?.parentId !== undefined) {
        if (input.filters.parentId === null) {
          conditions.push(isNull(productsItemGroup.parent_id));
        } else {
          conditions.push(eq(productsItemGroup.parent_id, input.filters.parentId));
        }
      }
      if (input.filters?.search) {
        conditions.push(ilike(productsItemGroup.name, `%${input.filters.search}%`));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      checkPage(input);
      let query = ctx.db
        .select()
        .from(productsItemGroup)
        .where(where)
        .orderBy(productsItemGroup.name)
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
