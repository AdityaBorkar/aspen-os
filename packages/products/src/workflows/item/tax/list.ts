import { productsItemTax } from "#/db-schemas";
import { IdSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const ListInputSchema = object({ itemId: IdSchema });

export const listItemTaxes = Workflow.name("products.item.tax.list")
  .input(ListInputSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(productsItemTax).where(eq(productsItemTax.item_id, input.itemId)),
    ),
  );
