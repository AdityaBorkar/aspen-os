import { productsItemPrice, productsPriceList } from "#/db-schemas";
import type { ProductsItem } from "#/db-schemas/item";
import type { ProductsItemPrice } from "#/db-schemas/item-price";
import type { ProductsPriceList } from "#/db-schemas/price-list";
import type { RateSide } from "#/schemas/item-price";
import { walkGroupAncestors } from "#/services/group-hierarchy";
import { getPricelistSettings } from "#/services/pricing-settings";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, count, eq, inArray } from "drizzle-orm";

type Db = WorkflowContext["db"];

export interface ResolvedPriceListLabel {
  label: string;
  source: "group" | "item";
}

export async function resolvePriceListLabel(
  db: Db,
  item: ProductsItem,
): Promise<ResolvedPriceListLabel | null> {
  if (item.default_price_list !== null && item.default_price_list !== undefined) {
    return { label: item.default_price_list, source: "item" };
  }
  const chain = await walkGroupAncestors(db, item.item_group_id);
  for (const group of chain) {
    if (group.default_price_list !== null && group.default_price_list !== undefined) {
      return { label: group.default_price_list, source: "group" };
    }
  }
  return null;
}

export async function findPriceListByName(db: Db, name: string): Promise<ProductsPriceList | null> {
  const [row] = await db
    .select()
    .from(productsPriceList)
    .where(eq(productsPriceList.name, name))
    .limit(1);
  return row ?? null;
}

export function resolveFetchSide(
  inputSide: RateSide | null | undefined,
  applicability: ProductsPriceList["applicability"],
): RateSide | null {
  if (inputSide !== null && inputSide !== undefined) {
    if (applicability === "both" || inputSide === applicability) {
      return inputSide;
    }
    throw new Error(`Side "${inputSide}" is not covered by a "${applicability}" price list.`);
  }
  if (applicability === "both") {
    return null;
  }
  return applicability;
}

export interface PriceListRequest {
  item: ProductsItem;
  priceListId?: string | null;
  priceListName?: string | null;
  side?: RateSide | null;
}

/**
 * Single price-list resolution policy shared by every price-fetch workflow:
 * explicit id wins, then explicit name, then the item/group default label,
 * then the configured buying/selling fallbacks. A resolved-but-disabled list
 * yields null (no fallback) — same as a missing list.
 */
export async function resolvePriceList(
  db: Db,
  request: PriceListRequest,
): Promise<ProductsPriceList | null> {
  if (request.priceListId !== null && request.priceListId !== undefined) {
    const [byId] = await db
      .select()
      .from(productsPriceList)
      .where(eq(productsPriceList.id, request.priceListId))
      .limit(1);
    if (!byId) {
      throw new Error(`Price list with id "${request.priceListId}" not found.`);
    }
    return byId.is_enabled ? byId : null;
  }
  if (request.priceListName !== null && request.priceListName !== undefined) {
    const named = await findPriceListByName(db, request.priceListName);
    return named !== null && named.is_enabled ? named : null;
  }
  const label = await resolvePriceListLabel(db, request.item);
  if (label !== null) {
    const labeled = await findPriceListByName(db, label.label);
    return labeled !== null && labeled.is_enabled ? labeled : null;
  }
  const settings = await getPricelistSettings(db);
  const fallbackIds =
    request.side === "buying"
      ? [settings.default_buying_list_id]
      : request.side === "selling"
        ? [settings.default_selling_list_id]
        : [settings.default_selling_list_id, settings.default_buying_list_id];
  const ids = fallbackIds.filter((id): id is string => id !== null);
  if (ids.length === 0) {
    return null;
  }
  const rows = await db.select().from(productsPriceList).where(inArray(productsPriceList.id, ids));
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of ids) {
    const fallback = byId.get(id);
    if (fallback !== undefined && fallback.is_enabled) {
      return fallback;
    }
  }
  return null;
}

export async function loadActiveRowsForItemList(
  db: Db,
  priceListId: string,
  itemId: string,
): Promise<ProductsItemPrice[]> {
  return db
    .select()
    .from(productsItemPrice)
    .where(
      and(
        eq(productsItemPrice.price_list_id, priceListId),
        eq(productsItemPrice.item_id, itemId),
        eq(productsItemPrice.status, "active"),
      ),
    );
}

export async function loadActiveRowsForList(
  db: Db,
  priceListId: string,
): Promise<ProductsItemPrice[]> {
  return db
    .select()
    .from(productsItemPrice)
    .where(
      and(eq(productsItemPrice.price_list_id, priceListId), eq(productsItemPrice.status, "active")),
    );
}

export async function loadActiveRowsForItem(db: Db, itemId: string): Promise<ProductsItemPrice[]> {
  return db
    .select()
    .from(productsItemPrice)
    .where(and(eq(productsItemPrice.item_id, itemId), eq(productsItemPrice.status, "active")));
}

export async function countRowsForItem(db: Db, itemId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(productsItemPrice)
    .where(eq(productsItemPrice.item_id, itemId));
  return row?.value ?? 0;
}
