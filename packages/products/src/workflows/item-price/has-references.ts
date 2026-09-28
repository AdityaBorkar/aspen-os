import { HasPriceReferencesSchema } from "#/schemas";
import { countRowsForItem } from "#/services/pricing-lists";

import { Workflow } from "@aspen-os/platform/server";

export const hasPriceReferences = Workflow.name("products.item-price.has-references")
  .input(HasPriceReferencesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const count = await countRowsForItem(ctx.db, input.itemId);
      return { count, hasReferences: count > 0, itemId: input.itemId };
    }),
  );
