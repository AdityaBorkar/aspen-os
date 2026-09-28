import { productsItemPrice, productsPriceList } from "#/db-schemas";
import type { NewProductsItemPrice, ProductsItemPrice } from "#/db-schemas/item-price";
import type { ProductsPriceList } from "#/db-schemas/price-list";
import type { RateSide } from "#/schemas/item-price";
import { fetchEligibleItem, fetchItemUoms, resolveUom } from "#/services/item-eligibility";
import { toDateKey, todayKey } from "#/services/pricing-dates";
import { findOverlappingRow } from "#/services/pricing-rank";
import type { OverlapFilter } from "#/services/pricing-rank";
import { getPricelistSettings } from "#/services/pricing-settings";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

type Db = WorkflowContext["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

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

/** Packing units are counts: reject non-positive values instead of coercing them to null. */
export function normalizePackingUnit(packingUnit: number | null | undefined): number | null {
  if (packingUnit === null || packingUnit === undefined) {
    return null;
  }
  if (!(packingUnit > 0)) {
    throw new Error("packingUnit must be > 0.");
  }
  return packingUnit;
}

/**
 * Single effective side for capability checks: party-specific rows take their
 * party's side, generic rows take a single-sided list's side (both stays null).
 * A generic row on a both-applicability list additionally requires both
 * capabilities (see below), preserving the legacy matrix exactly.
 */
function resolveEffectiveSide(
  draft: ItemPriceDraft,
  applicability: ProductsPriceList["applicability"],
): RateSide | null {
  if (draft.customerId !== null) {
    return "selling";
  }
  if (draft.supplierId !== null) {
    return "buying";
  }
  return applicability === "both" ? null : applicability;
}

export interface ResolvedPriceValues {
  conversionFactor: number | null;
  uom: string;
  validFrom: string;
  validUpto: string | null;
}

/** Pure row builder: no I/O, no throws except packing-unit normalization. */
export function toNewItemPriceRow(
  draft: ItemPriceDraft,
  resolved: ResolvedPriceValues,
): NewProductsItemPrice {
  return {
    batch_no: draft.batchNo,
    conversion_factor: resolved.conversionFactor,
    customer_id: draft.customerId,
    item_id: draft.itemId,
    lead_time_days: draft.leadTimeDays,
    min_qty: draft.minQty,
    note: draft.note,
    packing_unit: normalizePackingUnit(draft.packingUnit),
    price_list_id: draft.priceListId,
    rate: draft.rate,
    status: draft.status,
    supplier_id: draft.supplierId,
    uom: resolved.uom,
    valid_from: resolved.validFrom,
    valid_upto: resolved.validUpto,
  };
}

/** Throwing overlap guard over already-loaded sibling rows. */
export function assertNoOverlap(rows: ProductsItemPrice[], filter: OverlapFilter): void {
  const overlap = findOverlappingRow(rows, filter);
  if (overlap) {
    throw new Error(`Overlapping validity with item price "${overlap.id}" for the same price key.`);
  }
}

export async function validateItemPriceValues(
  db: DbOrTx,
  draft: ItemPriceDraft,
  excludeId?: string,
): Promise<NewProductsItemPrice> {
  if (!(draft.rate >= 0)) {
    throw new Error("rate must be >= 0.");
  }
  if (draft.customerId !== null && draft.supplierId !== null) {
    throw new Error("customerId and supplierId must never both be set.");
  }

  const [[list], settings] = await Promise.all([
    db.select().from(productsPriceList).where(eq(productsPriceList.id, draft.priceListId)).limit(1),
    getPricelistSettings(db),
  ]);
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

  if (!settings.allow_party_specific && (draft.customerId !== null || draft.supplierId !== null)) {
    throw new Error("Party-specific prices are disabled by pricelist settings.");
  }
  if (!settings.allow_batch_specific && draft.batchNo !== null) {
    throw new Error("Batch-specific prices are disabled by pricelist settings.");
  }

  const side = resolveEffectiveSide(draft, list.applicability);
  const [item, itemUoms, siblings] = await Promise.all([
    fetchEligibleItem(db, draft.itemId, side),
    fetchItemUoms(db, draft.itemId),
    db
      .select()
      .from(productsItemPrice)
      .where(
        and(
          eq(productsItemPrice.price_list_id, draft.priceListId),
          eq(productsItemPrice.item_id, draft.itemId),
        ),
      ),
  ]);
  if (
    draft.customerId === null &&
    draft.supplierId === null &&
    list.applicability === "both" &&
    (!item.is_sales_item || !item.is_purchase_item)
  ) {
    if (!item.is_sales_item) {
      throw new Error(`Item "${item.item_code}" is not a sales item.`);
    }
    throw new Error(`Item "${item.item_code}" is not a purchase item.`);
  }
  if (draft.batchNo !== null && !item.has_batch_no) {
    throw new Error(`Item "${item.item_code}" is not batch-tracked (hasBatchNo must be true).`);
  }

  const uom = draft.uom ?? item.default_uom;
  const resolvedUom = resolveUom(item, itemUoms, uom);
  if (resolvedUom === null) {
    throw new Error(`UOM "${uom}" is not defined for item "${item.item_code}".`);
  }

  const validFrom = draft.validFrom === null ? todayKey() : toDateKey(draft.validFrom);
  const validUpto = draft.validUpto === null ? null : toDateKey(draft.validUpto);
  if (settings.require_validity && validUpto === null) {
    throw new Error("validUpto is required by pricelist settings.");
  }
  if (validUpto !== null && validUpto < validFrom) {
    throw new Error("validUpto must be on or after validFrom.");
  }

  assertNoOverlap(siblings, {
    batchNo: draft.batchNo,
    customerId: draft.customerId,
    excludeId,
    from: validFrom,
    minQty: draft.minQty,
    supplierId: draft.supplierId,
    uom,
    upto: validUpto,
  });

  return toNewItemPriceRow(draft, {
    conversionFactor: resolvedUom.factor,
    uom,
    validFrom,
    validUpto,
  });
}
