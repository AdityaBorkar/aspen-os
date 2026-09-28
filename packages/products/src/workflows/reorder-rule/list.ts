import { productsReorderRule } from "#/db-schemas";
import { ListReorderRulesSchema } from "#/schemas";
import { checkPage } from "#/workflows/utils";

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
      checkPage(input);
      let query = ctx.db.select().from(productsReorderRule).where(where).$dynamic();
      if (input.limit !== undefined) {
        query = query.limit(input.limit);
      }
      if (input.offset !== undefined) {
        query = query.offset(input.offset);
      }
      return query;
    }),
  );
