import { productsBarcode, productsItem } from "#/db-schemas";
import { GetByBarcodeSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const getByBarcode = Workflow.name("products.lookup.get-by-barcode")
  .input(GetByBarcodeSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const [link] = await ctx.db
        .select({ itemId: productsBarcode.item_id })
        .from(productsBarcode)
        .where(eq(productsBarcode.barcode, input.barcode))
        .limit(1);
      if (!link) {
        throw new Error(`Barcode "${input.barcode}" not found.`);
      }
      const [row] = await ctx.db
        .select()
        .from(productsItem)
        .where(eq(productsItem.id, link.itemId))
        .limit(1);
      if (!row) {
        throw new Error(`Item for barcode "${input.barcode}" not found.`);
      }
      if (row.is_disabled || row.status !== "active") {
        throw new Error("Item for this barcode is disabled.");
      }
      if (row.has_variants) {
        throw new Error("Template items never transact. Use a variant.");
      }
      return row;
    }),
  );
