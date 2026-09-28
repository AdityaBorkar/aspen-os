import { productsItem } from "#/db-schemas";
import { GetByCodeSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const getByCode = Workflow.name("products.lookup.get-by-code")
  .input(GetByCodeSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const [row] = await ctx.db
        .select()
        .from(productsItem)
        .where(eq(productsItem.item_code, input.itemCode))
        .limit(1);
      if (!row) {
        throw new Error(`Item with code "${input.itemCode}" not found.`);
      }
      if (row.is_disabled || row.status !== "active") {
        throw new Error(`Item "${input.itemCode}" is not selectable (disabled).`);
      }
      if (row.has_variants) {
        throw new Error(
          `Item "${input.itemCode}" is a template and never transacts. Use a variant.`,
        );
      }
      return row;
    }),
  );
