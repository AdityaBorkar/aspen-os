import { productsReorderRule } from "#/db-schemas";
import { ResolveDefaultsSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const getReorderRules = Workflow.name("products.lookup.get-reorder-rules")
  .input(ResolveDefaultsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(productsReorderRule)
        .where(
          and(
            eq(productsReorderRule.item_id, input.itemId),
            eq(productsReorderRule.is_disabled, false),
          ),
        ),
    ),
  );
