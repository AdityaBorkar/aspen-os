import { productsItemPrice, productsPriceList } from "#/db-schemas";
import type { ProductsItem } from "#/db-schemas/item";
import type { ProductsItemPrice } from "#/db-schemas/item-price";
import type { ProductsPriceList } from "#/db-schemas/price-list";
import type { RateSide } from "#/schemas/item-price";
import { nearestAncestorValue, walkGroupAncestors } from "#/services/group-hierarchy";
import { getPricelistSettings } from "#/services/pricing-settings";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, count, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

type Db = WorkflowContext["db"];

export interface ResolvedPriceListLabel {
  label: string;
  source: "group" | "item";
}

export async function resolvePriceListLabel(
  db: Db,
  item: ProductsItem,
): Promise<ResolvedPriceListLabel | null> {
  if (item.default_price_list != null) {
    return { label: item.default_price_list, source: "item" };
  }
  const chain = await walkGroupAncestors(db, item.item_group_id);
  const label = nearestAncestorValue(chain, (group) => group.default_price_list);
  return label == null ? null : { label, source: "group" };
}

export async function findPriceListByName(db: Db, name: string): Promise<ProductsPriceList | null> {
  const [row] = await db
    .select()
    .from(productsPriceList)
    .where(eq(productsPriceList.name, name))
    .limit(1);
  return row ?? null;
}

function onlyIfEnabled(list: ProductsPriceList | null | undefined): ProductsPriceList | null {
  return list != null && list.is_enabled ? list : null;
}

export function resolveFetchSide(
  inputSide: RateSide | null | undefined,
  applicability: ProductsPriceList["applicability"],
): RateSide | null {
  if (inputSide != null) {
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
  if (request.priceListId != null) {
    const [byId] = await db
      .select()
      .from(productsPriceList)
      .where(eq(productsPriceList.id, request.priceListId))
      .limit(1);
    if (!byId) {
      throw new Error(`Price list with id "${request.priceListId}" not found.`);
    }
    return onlyIfEnabled(byId);
  }
  if (request.priceListName != null) {
    return onlyIfEnabled(await findPriceListByName(db, request.priceListName));
  }
  const label = await resolvePriceListLabel(db, request.item);
  if (label !== null) {
    return onlyIfEnabled(await findPriceListByName(db, label.label));
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
    const fallback = onlyIfEnabled(byId.get(id));
    if (fallback !== null) {
      return fallback;
    }
  }
  return null;
}

export interface ActiveRowsFilter {
  itemId?: string;
  priceListId?: string;
}

export async function loadActiveRows(
  db: Db,
  filter: ActiveRowsFilter,
): Promise<ProductsItemPrice[]> {
  const conditions: SQL[] = [eq(productsItemPrice.status, "active")];
  if (filter.priceListId !== undefined) {
    conditions.push(eq(productsItemPrice.price_list_id, filter.priceListId));
  }
  if (filter.itemId !== undefined) {
    conditions.push(eq(productsItemPrice.item_id, filter.itemId));
  }
  return db
    .select()
    .from(productsItemPrice)
    .where(and(...conditions));
}

/** @deprecated Use loadActiveRows(db, { priceListId, itemId }) instead. */
export async function loadActiveRowsForItemList(
  db: Db,
  priceListId: string,
  itemId: string,
): Promise<ProductsItemPrice[]> {
  return loadActiveRows(db, { itemId, priceListId });
}

/** @deprecated Use loadActiveRows(db, { priceListId }) instead. */
export async function loadActiveRowsForList(
  db: Db,
  priceListId: string,
): Promise<ProductsItemPrice[]> {
  return loadActiveRows(db, { priceListId });
}

/** @deprecated Use loadActiveRows(db, { itemId }) instead. */
export async function loadActiveRowsForItem(db: Db, itemId: string): Promise<ProductsItemPrice[]> {
  return loadActiveRows(db, { itemId });
}

export async function countRowsForItem(db: Db, itemId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(productsItemPrice)
    .where(eq(productsItemPrice.item_id, itemId));
  return row?.value ?? 0;
}
