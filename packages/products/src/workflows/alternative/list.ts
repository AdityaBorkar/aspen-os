import { productsItemAlternative } from "#/db-schemas";
import { ListAlternativesSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq, or } from "drizzle-orm";

export const listAlternatives = Workflow.name("products.alternative.list")
  .input(ListAlternativesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(productsItemAlternative)
        .where(
          or(
            eq(productsItemAlternative.item_id, input.itemId),
            eq(productsItemAlternative.alternative_item_id, input.itemId),
          ),
        ),
    ),
  );
