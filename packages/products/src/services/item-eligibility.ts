import { productsItem, productsItemUom } from "#/db-schemas";
import type { ProductsItem } from "#/db-schemas/item";
import type { ProductsItemUom } from "#/db-schemas/item-uom";
import type { RateSide } from "#/schemas/item-price";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

type Db = WorkflowContext["db"];

export async function fetchEligibleItem(
  db: Db,
  itemId: string,
  side: RateSide | null,
): Promise<ProductsItem> {
  const [item] = await db.select().from(productsItem).where(eq(productsItem.id, itemId)).limit(1);
  if (!item) {
    throw new Error(`Item with id "${itemId}" not found.`);
  }
  if (item.is_disabled || item.status !== "active") {
    throw new Error(`Item "${item.item_code}" is not selectable (disabled).`);
  }
  if (item.has_variants) {
    throw new Error(`Item "${item.item_code}" is a template and never transacts. Use a variant.`);
  }
  if (side === "selling" && !item.is_sales_item) {
    throw new Error(`Item "${item.item_code}" is not a sales item.`);
  }
  if (side === "buying" && !item.is_purchase_item) {
    throw new Error(`Item "${item.item_code}" is not a purchase item.`);
  }
  if (side === null && !item.is_sales_item && !item.is_purchase_item) {
    throw new Error(`Item "${item.item_code}" is neither a sales nor a purchase item.`);
  }
  return item;
}

export async function fetchItemUoms(db: Db, itemId: string): Promise<ProductsItemUom[]> {
  return db.select().from(productsItemUom).where(eq(productsItemUom.item_id, itemId));
}

export function isKnownUom(item: ProductsItem, itemUoms: ProductsItemUom[], uom: string): boolean {
  if (uom === item.default_uom) {
    return true;
  }
  if (uom === item.default_purchase_uom || uom === item.default_sales_uom) {
    return true;
  }
  for (const row of itemUoms) {
    if (row.uom === uom) {
      return true;
    }
  }
  return false;
}

export function resolveUomFactor(
  item: ProductsItem,
  itemUoms: ProductsItemUom[],
  uom: string,
): number | null {
  if (uom === item.default_uom) {
    return 1;
  }
  for (const row of itemUoms) {
    if (row.uom === uom) {
      return row.conversion_factor;
    }
  }
  return null;
}

export function findUomRow(itemUoms: ProductsItemUom[], uom: string): ProductsItemUom | null {
  for (const row of itemUoms) {
    if (row.uom === uom) {
      return row;
    }
  }
  return null;
}
