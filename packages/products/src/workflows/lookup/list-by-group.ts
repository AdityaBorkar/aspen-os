import { productsItem } from "#/db-schemas";
import { ListByGroupSchema } from "#/schemas";
import { collectDescendantGroupIds } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listByGroup = Workflow.name("products.lookup.list-by-group")
  .input(ListByGroupSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const groupIds = !input.includeDescendants
        ? [input.itemGroupId]
        : await collectDescendantGroupIds(ctx.db, input.itemGroupId);
      const conditions: SQL[] = [
        inArray(productsItem.item_group_id, groupIds),
        eq(productsItem.is_disabled, false),
      ];
      const rows = await ctx.db
        .select()
        .from(productsItem)
        .where(and(...conditions))
        .orderBy(productsItem.item_code);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? rows.length;
      return rows.slice(offset, offset + limit);
    }),
  );
