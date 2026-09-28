import { productsItemSupplierCode } from "#/db-schemas";
import { IdSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const ListInputSchema = object({ itemId: IdSchema });

export const listSupplierCodes = Workflow.name("products.item.supplier-code.list")
  .input(ListInputSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(productsItemSupplierCode)
        .where(eq(productsItemSupplierCode.item_id, input.itemId)),
    ),
  );
