import { productsItemPrice } from "#/db-schemas";
import { ListItemPricesSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listItemPrices = Workflow.name("products.item-price.list")
  .input(ListItemPricesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      const { filters } = input;
      if (filters?.itemId !== undefined) {
        conditions.push(eq(productsItemPrice.item_id, filters.itemId));
      }
      if (filters?.priceListId !== undefined) {
        conditions.push(eq(productsItemPrice.price_list_id, filters.priceListId));
      }
      if (filters?.status !== undefined) {
        conditions.push(eq(productsItemPrice.status, filters.status));
      }
      if (filters?.customerId !== undefined) {
        conditions.push(eq(productsItemPrice.customer_id, filters.customerId));
      }
      if (filters?.supplierId !== undefined) {
        conditions.push(eq(productsItemPrice.supplier_id, filters.supplierId));
      }
      if (filters?.batchNo !== undefined) {
        conditions.push(eq(productsItemPrice.batch_no, filters.batchNo));
      }
      if (filters?.uom !== undefined) {
        conditions.push(eq(productsItemPrice.uom, filters.uom));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await ctx.db
        .select()
        .from(productsItemPrice)
        .where(where)
        .orderBy(productsItemPrice.valid_from);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? rows.length;
      return rows.slice(offset, offset + limit);
    }),
  );
