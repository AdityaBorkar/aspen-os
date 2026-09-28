import { productsItem, productsItemUom } from "#/db-schemas";
import type { ProductsItem } from "#/db-schemas/item";
import type { ProductsItemUom } from "#/db-schemas/item-uom";
import type { RateSide } from "#/schemas/item-price";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

type Db = WorkflowContext["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

export async function fetchEligibleItem(
  db: DbOrTx,
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

export async function fetchItemUoms(db: DbOrTx, itemId: string): Promise<ProductsItemUom[]> {
  return db.select().from(productsItemUom).where(eq(productsItemUom.item_id, itemId));
}

export interface ResolvedUom {
  /** Factor is null for a known UOM with no conversion row (default_purchase/sales fallback). */
  factor: number | null;
  row: ProductsItemUom | null;
}

/**
 * Single-pass UOM resolver. Preserves the exact legacy semantics:
 * default_uom → factor 1, item-UOM rows → their factor,
 * default_purchase/sales UOMs without a row → known but null factor.
 */
export function resolveUom(
  item: ProductsItem,
  itemUoms: ProductsItemUom[],
  uom: string,
): ResolvedUom | null {
  let row: ProductsItemUom | null = null;
  for (const candidate of itemUoms) {
    if (candidate.uom === uom) {
      row = candidate;
      break;
    }
  }
  if (uom === item.default_uom) {
    return { factor: 1, row };
  }
  if (row !== null) {
    return { factor: row.conversion_factor, row };
  }
  if (uom === item.default_purchase_uom || uom === item.default_sales_uom) {
    return { factor: null, row: null };
  }
  return null;
}

export function isKnownUom(item: ProductsItem, itemUoms: ProductsItemUom[], uom: string): boolean {
  return resolveUom(item, itemUoms, uom) !== null;
}

export function resolveUomFactor(
  item: ProductsItem,
  itemUoms: ProductsItemUom[],
  uom: string,
): number | null {
  return resolveUom(item, itemUoms, uom)?.factor ?? null;
}

export function findUomRow(itemUoms: ProductsItemUom[], uom: string): ProductsItemUom | null {
  for (const row of itemUoms) {
    if (row.uom === uom) {
      return row;
    }
  }
  return null;
}
