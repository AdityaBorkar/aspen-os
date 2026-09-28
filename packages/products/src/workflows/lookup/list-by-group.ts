import { productsItem } from "#/db-schemas";
import { ListByGroupSchema } from "#/schemas";
import { collectDescendantGroupIds } from "#/services/group-hierarchy";
import { checkPage } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listByGroup = Workflow.name("products.lookup.list-by-group")
  .input(ListByGroupSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      checkPage(input);
      const groupIds = !input.includeDescendants
        ? [input.itemGroupId]
        : await collectDescendantGroupIds(ctx.db, input.itemGroupId);
      const conditions: SQL[] = [
        inArray(productsItem.item_group_id, groupIds),
        eq(productsItem.is_disabled, false),
      ];
      let query = ctx.db
        .select()
        .from(productsItem)
        .where(and(...conditions))
        .orderBy(productsItem.item_code)
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
