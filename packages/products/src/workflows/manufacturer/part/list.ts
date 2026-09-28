import { productsManufacturerPart } from "#/db-schemas";
import { ListManufacturerPartsSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listManufacturerParts = Workflow.name("products.manufacturer.part.list")
  .input(ListManufacturerPartsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.itemId !== undefined) {
        conditions.push(eq(productsManufacturerPart.item_id, input.itemId));
      }
      if (input.manufacturerId !== undefined) {
        conditions.push(eq(productsManufacturerPart.manufacturer_id, input.manufacturerId));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return ctx.db.select().from(productsManufacturerPart).where(where);
    }),
  );
