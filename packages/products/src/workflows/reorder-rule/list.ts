import { productsReorderRule } from "#/db-schemas";
import { ListReorderRulesSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listReorderRules = Workflow.name("products.reorder-rule.list")
  .input(ListReorderRulesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.filters?.itemId !== undefined) {
        conditions.push(eq(productsReorderRule.item_id, input.filters.itemId));
      }
      if (input.filters?.checkInGroupId !== undefined) {
        conditions.push(eq(productsReorderRule.check_in_group_id, input.filters.checkInGroupId));
      }
      if (input.filters?.isDisabled !== undefined) {
        conditions.push(eq(productsReorderRule.is_disabled, input.filters.isDisabled));
      }
      if (input.filters?.materialRequestType !== undefined) {
        conditions.push(
          eq(productsReorderRule.material_request_type, input.filters.materialRequestType),
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await ctx.db.select().from(productsReorderRule).where(where);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? rows.length;
      return rows.slice(offset, offset + limit);
    }),
  );
