import { productsItemUom } from "#/db-schemas";
import { ListItemUomsSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const listItemUoms = Workflow.name("products.item-uom.list")
  .input(ListItemUomsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(productsItemUom).where(eq(productsItemUom.item_id, input.itemId)),
    ),
  );
