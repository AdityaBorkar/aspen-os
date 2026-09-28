import {
  productsItem,
  productsItemGroup,
  productsItemPrice,
  productsItemUom,
  productsPriceList,
  productsPricelistSetting,
  productsSetting,
} from "#/db-schemas";
import type { ProductsItem } from "#/db-schemas/item";
import type { ProductsItemPrice, NewProductsItemPrice } from "#/db-schemas/item-price";
import type { ProductsItemUom } from "#/db-schemas/item-uom";
import type { ProductsPriceList } from "#/db-schemas/price-list";
import type { ProductsPricelistSetting } from "#/db-schemas/pricelist-setting";
import type { ProductsSetting } from "#/db-schemas/setting";
import type { RateSide } from "#/schemas/item-price";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

type Db = WorkflowContext["db"];

export function toDateKey(value: Date): string {
  const [key] = value.toISOString().split("T");
  if (key === undefined) {
    throw new Error("Unable to derive a date key.");
  }
  return key;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function dateKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export async function getPricelistSettings(db: Db): Promise<ProductsPricelistSetting> {
  const [row] = await db.select().from(productsPricelistSetting).limit(1);
  if (row) {
    return row;
  }
  const [created] = await db.insert(productsPricelistSetting).values({}).returning();
  if (!created) {
    throw new Error("Failed to initialize pricelist settings.");
  }
  return created;
}

export async function getProductsSettings(db: Db): Promise<ProductsSetting> {
  const [row] = await db.select().from(productsSetting).limit(1);
  if (row) {
    return row;
  }
  const [created] = await db.insert(productsSetting).values({}).returning();
  if (!created) {
    throw new Error("Failed to initialize products settings.");
  }
  return created;
}

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
  let currentGroupId = item.item_group_id;
  // oxlint-disable eslint/no-await-in-loop
  while (currentGroupId !== null && currentGroupId !== undefined) {
    const [group] = await db
      .select()
      .from(productsItemGroup)
      .where(eq(productsItemGroup.id, currentGroupId))
      .limit(1);
    if (!group) {
      break;
    }
    if (group.default_price_list !== null && group.default_price_list !== undefined) {
      return { label: group.default_price_list, source: "group" };
    }
    currentGroupId = group.parent_id;
  }
  // oxlint-enable eslint/no-await-in-loop
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

export interface ItemPriceKey {
  batchNo: string | null;
  customerId: string | null;
  minQty: number | null;
  supplierId: string | null;
  uom: string;
}

export function rowKey(row: ProductsItemPrice): ItemPriceKey {
  return {
    batchNo: row.batch_no,
    customerId: row.customer_id,
    minQty: row.min_qty,
    supplierId: row.supplier_id,
    uom: row.uom,
  };
}

export function samePriceKey(first: ItemPriceKey, second: ItemPriceKey): boolean {
  return (
    first.uom === second.uom &&
    first.minQty === second.minQty &&
    first.customerId === second.customerId &&
    first.supplierId === second.supplierId &&
    first.batchNo === second.batchNo
  );
}

export function isValidOn(row: ProductsItemPrice, dateKey: string): boolean {
  if (row.valid_from > dateKey) {
    return false;
  }
  if (row.valid_upto !== null && dateKey > row.valid_upto) {
    return false;
  }
  return true;
}

export interface ValidityRange {
  from: string;
  upto: string | null;
}

export function validityOverlaps(first: ValidityRange, second: ValidityRange): boolean {
  const firstEnd = first.upto ?? "9999-12-31";
  const secondEnd = second.upto ?? "9999-12-31";
  return first.from <= secondEnd && second.from <= firstEnd;
}

export interface OverlapQuery {
  excludeId?: string;
  key: ItemPriceKey;
  range: ValidityRange;
}

export function findOverlappingRow(
  rows: ProductsItemPrice[],
  query: OverlapQuery,
): ProductsItemPrice | null {
  for (const row of rows) {
    if (row.status !== "active" && row.status !== "draft") {
      continue;
    }
    if (query.excludeId !== undefined && row.id === query.excludeId) {
      continue;
    }
    if (!samePriceKey(rowKey(row), query.key)) {
      continue;
    }
    if (validityOverlaps({ from: row.valid_from, upto: row.valid_upto }, query.range)) {
      return row;
    }
  }
  return null;
}

export interface RankRequest {
  batchNo: string | null;
  customerId: string | null;
  dateKey: string;
  qty: number;
  supplierId: string | null;
  uom: string;
}

function specificityScore(row: ProductsItemPrice, request: RankRequest): number {
  const partyMatch =
    (row.customer_id !== null && row.customer_id === request.customerId) ||
    (row.supplier_id !== null && row.supplier_id === request.supplierId);
  const batchMatch = row.batch_no !== null && row.batch_no === request.batchNo;
  if (partyMatch && batchMatch) {
    return 4;
  }
  if (partyMatch) {
    return 3;
  }
  if (batchMatch) {
    return 2;
  }
  return 1;
}

interface ScoredCandidate {
  row: ProductsItemPrice;
  score: number;
}

function compareRanked(first: ScoredCandidate, second: ScoredCandidate): number {
  if (first.score !== second.score) {
    return second.score - first.score;
  }
  const firstMin = first.row.min_qty ?? -1;
  const secondMin = second.row.min_qty ?? -1;
  if (firstMin !== secondMin) {
    return secondMin - firstMin;
  }
  if (first.row.valid_from !== second.row.valid_from) {
    return first.row.valid_from > second.row.valid_from ? -1 : 1;
  }
  const firstLead = first.row.lead_time_days ?? Number.MAX_SAFE_INTEGER;
  const secondLead = second.row.lead_time_days ?? Number.MAX_SAFE_INTEGER;
  if (firstLead !== secondLead) {
    return firstLead - secondLead;
  }
  if (first.row.created_at.getTime() !== second.row.created_at.getTime()) {
    return first.row.created_at < second.row.created_at ? -1 : 1;
  }
  if (first.row.id === second.row.id) {
    return 0;
  }
  return first.row.id < second.row.id ? -1 : 1;
}

function isThresholdEligible(row: ProductsItemPrice, request: RankRequest): boolean {
  if (row.status !== "active") {
    return false;
  }
  if (!isValidOn(row, request.dateKey)) {
    return false;
  }
  if (row.min_qty !== null && row.min_qty > request.qty) {
    return false;
  }
  if (row.customer_id !== null && row.customer_id !== request.customerId) {
    return false;
  }
  if (row.supplier_id !== null && row.supplier_id !== request.supplierId) {
    return false;
  }
  if (row.batch_no !== null && row.batch_no !== request.batchNo) {
    return false;
  }
  return true;
}

export function rankItemPriceCandidates(
  rows: ProductsItemPrice[],
  request: RankRequest,
): ProductsItemPrice[] {
  const eligible = rows.filter(
    (row) => row.uom === request.uom && isThresholdEligible(row, request),
  );
  const scored: ScoredCandidate[] = eligible.map((row) => ({
    row,
    score: specificityScore(row, request),
  }));
  scored.sort((first, second) => compareRanked(first, second));
  return scored.map((entry) => entry.row);
}

export interface ConvertedCandidate {
  convertedRate: number;
  row: ProductsItemPrice;
}

export function rankConvertibleCandidates(
  rows: ProductsItemPrice[],
  request: RankRequest,
  resolveFactor: (uom: string) => number | null,
): ConvertedCandidate[] {
  const txnFactor = resolveFactor(request.uom);
  if (txnFactor === null) {
    return [];
  }
  const scored: (ConvertedCandidate & { score: number })[] = [];
  for (const row of rows) {
    if (row.uom === request.uom) {
      continue;
    }
    if (!isThresholdEligible(row, request)) {
      continue;
    }
    const rowFactor = resolveFactor(row.uom);
    if (rowFactor === null || rowFactor === 0) {
      continue;
    }
    scored.push({
      convertedRate: (row.rate * txnFactor) / rowFactor,
      row,
      score: specificityScore(row, request),
    });
  }
  scored.sort((first, second) => compareRanked(first, second));
  return scored.map(({ convertedRate, row }) => ({ convertedRate, row }));
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

export interface ItemPriceDraft {
  batchNo: string | null;
  customerId: string | null;
  itemId: string;
  leadTimeDays: number | null;
  minQty: number | null;
  note: string | null;
  packingUnit: number | null;
  priceListId: string;
  rate: number;
  status: "active" | "draft";
  supplierId: string | null;
  uom: string | null;
  validFrom: Date | null;
  validUpto: Date | null;
}

export async function validateItemPriceValues(
  db: Db,
  draft: ItemPriceDraft,
  excludeId?: string,
): Promise<NewProductsItemPrice> {
  if (!(draft.rate >= 0)) {
    throw new Error("rate must be >= 0.");
  }
  if (draft.customerId !== null && draft.supplierId !== null) {
    throw new Error("customerId and supplierId must never both be set.");
  }

  const [list] = await db
    .select()
    .from(productsPriceList)
    .where(eq(productsPriceList.id, draft.priceListId))
    .limit(1);
  if (!list) {
    throw new Error(`Price list with id "${draft.priceListId}" not found.`);
  }
  if (!list.is_enabled) {
    throw new Error(`Price list "${list.name}" is disabled.`);
  }

  const coversSelling = list.applicability === "selling" || list.applicability === "both";
  const coversBuying = list.applicability === "buying" || list.applicability === "both";
  if (draft.customerId !== null && !coversSelling) {
    throw new Error("customerId is only allowed when the list covers selling.");
  }
  if (draft.supplierId !== null && !coversBuying) {
    throw new Error("supplierId is only allowed when the list covers buying.");
  }

  const settings = await getPricelistSettings(db);
  if (!settings.allow_party_specific && (draft.customerId !== null || draft.supplierId !== null)) {
    throw new Error("Party-specific prices are disabled by pricelist settings.");
  }
  if (!settings.allow_batch_specific && draft.batchNo !== null) {
    throw new Error("Batch-specific prices are disabled by pricelist settings.");
  }

  const item = await fetchEligibleItem(db, draft.itemId, null);
  if (coversSelling && (draft.customerId !== null || draft.supplierId === null)) {
    if (!item.is_sales_item) {
      throw new Error(`Item "${item.item_code}" is not a sales item.`);
    }
  }
  if (coversBuying && (draft.supplierId !== null || draft.customerId === null)) {
    if (!item.is_purchase_item) {
      throw new Error(`Item "${item.item_code}" is not a purchase item.`);
    }
  }
  if (draft.batchNo !== null && !item.has_batch_no) {
    throw new Error(`Item "${item.item_code}" is not batch-tracked (hasBatchNo must be true).`);
  }

  const uom = draft.uom ?? item.default_uom;
  const itemUoms = await fetchItemUoms(db, draft.itemId);
  if (!isKnownUom(item, itemUoms, uom)) {
    throw new Error(`UOM "${uom}" is not defined for item "${item.item_code}".`);
  }
  const conversionFactor = resolveUomFactor(item, itemUoms, uom);

  const validFrom = draft.validFrom === null ? todayKey() : toDateKey(draft.validFrom);
  const validUpto = draft.validUpto === null ? null : toDateKey(draft.validUpto);
  if (settings.require_validity && validUpto === null) {
    throw new Error("validUpto is required by pricelist settings.");
  }
  if (validUpto !== null && validUpto < validFrom) {
    throw new Error("validUpto must be on or after validFrom.");
  }

  const key: ItemPriceKey = {
    batchNo: draft.batchNo,
    customerId: draft.customerId,
    minQty: draft.minQty,
    supplierId: draft.supplierId,
    uom,
  };
  const siblings = await db
    .select()
    .from(productsItemPrice)
    .where(
      and(
        eq(productsItemPrice.price_list_id, draft.priceListId),
        eq(productsItemPrice.item_id, draft.itemId),
      ),
    );
  const overlap = findOverlappingRow(siblings, {
    excludeId,
    key,
    range: { from: validFrom, upto: validUpto },
  });
  if (overlap) {
    throw new Error(`Overlapping validity with item price "${overlap.id}" for the same price key.`);
  }

  return {
    batch_no: draft.batchNo,
    conversion_factor: conversionFactor,
    customer_id: draft.customerId,
    item_id: draft.itemId,
    lead_time_days: draft.leadTimeDays,
    min_qty: draft.minQty,
    note: draft.note,
    packing_unit: draft.packingUnit === 0 ? null : draft.packingUnit,
    price_list_id: draft.priceListId,
    rate: draft.rate,
    status: draft.status,
    supplier_id: draft.supplierId,
    uom,
    valid_from: validFrom,
    valid_upto: validUpto,
  };
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
  const rows = await db
    .select({ id: productsItemPrice.id })
    .from(productsItemPrice)
    .where(eq(productsItemPrice.item_id, itemId));
  return rows.length;
}

export async function markItemTransacted(db: Db, itemId: string): Promise<void> {
  await db
    .update(productsItem)
    .set({ has_transactions: true, updated_at: new Date() })
    .where(eq(productsItem.id, itemId));
}

export async function updateLastPurchaseRate(db: Db, itemId: string, rate: number): Promise<void> {
  await db
    .update(productsItem)
    .set({ last_purchase_rate: rate, updated_at: new Date() })
    .where(eq(productsItem.id, itemId));
}
