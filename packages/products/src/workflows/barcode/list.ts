import { productsBarcode } from "#/db-schemas";
import { ListBarcodesSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listBarcodes = Workflow.name("products.barcode.list")
  .input(ListBarcodesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.itemId !== undefined) {
        conditions.push(eq(productsBarcode.item_id, input.itemId));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return ctx.db.select().from(productsBarcode).where(where);
    }),
  );
