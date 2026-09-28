import { productsItem } from "#/db-schemas";
import { ListVariantsSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listVariants = Workflow.name("products.variant.list")
  .input(ListVariantsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [eq(productsItem.template_item_id, input.templateItemId)];
      if (!input.includeDisabled) {
        conditions.push(eq(productsItem.is_disabled, false));
      }
      return ctx.db
        .select()
        .from(productsItem)
        .where(and(...conditions))
        .orderBy(productsItem.item_code);
    }),
  );
