import { productsItem } from "#/db-schemas";
import { ListItemsSchema } from "#/schemas";
import { checkPage, escapeLike } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listItems = Workflow.name("products.item.list")
  .input(ListItemsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      checkPage(input);
      const conditions: SQL[] = [];
      const { filters } = input;
      if (filters?.brandId !== undefined) {
        conditions.push(eq(productsItem.brand_id, filters.brandId));
      }
      if (filters?.itemGroupId !== undefined) {
        conditions.push(eq(productsItem.item_group_id, filters.itemGroupId));
      }
      if (filters?.isDisabled !== undefined) {
        conditions.push(eq(productsItem.is_disabled, filters.isDisabled));
      }
      if (filters?.isStockItem !== undefined) {
        conditions.push(eq(productsItem.is_stock_item, filters.isStockItem));
      }
      if (filters?.isSalesItem !== undefined) {
        conditions.push(eq(productsItem.is_sales_item, filters.isSalesItem));
      }
      if (filters?.isPurchaseItem !== undefined) {
        conditions.push(eq(productsItem.is_purchase_item, filters.isPurchaseItem));
      }
      if (filters?.isFixedAsset !== undefined) {
        conditions.push(eq(productsItem.is_fixed_asset, filters.isFixedAsset));
      }
      if (filters?.hasVariants !== undefined) {
        conditions.push(eq(productsItem.has_variants, filters.hasVariants));
      }
      if (filters?.templateItemId !== undefined) {
        conditions.push(eq(productsItem.template_item_id, filters.templateItemId));
      }
      if (filters?.status !== undefined) {
        conditions.push(eq(productsItem.status, filters.status));
      }
      if (filters?.search) {
        const term = `%${escapeLike(filters.search)}%`;
        // SAFETY: or() with three defined ilike() branches always yields SQL; no undefined input by construction.
        conditions.push(
          or(
            ilike(productsItem.item_code, term),
            ilike(productsItem.item_name, term),
            ilike(productsItem.description, term),
          ) as SQL,
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      let query = ctx.db
        .select()
        .from(productsItem)
        .where(where)
        .orderBy(productsItem.item_code)
        .$dynamic();
      if (input.limit !== undefined) {
        query = query.limit(input.limit);
      }
      if (input.offset !== undefined) {
        query = query.offset(input.offset);
      }
      return query;
    }),
  );
