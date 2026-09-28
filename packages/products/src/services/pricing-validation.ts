import { productsItemPrice, productsPriceList } from "#/db-schemas";
import type { NewProductsItemPrice } from "#/db-schemas/item-price";
import {
  fetchEligibleItem,
  fetchItemUoms,
  isKnownUom,
  resolveUomFactor,
} from "#/services/item-eligibility";
import { toDateKey, todayKey } from "#/services/pricing-dates";
import { findOverlappingRow } from "#/services/pricing-rank";
import type { ItemPriceKey } from "#/services/pricing-rank";
import { getPricelistSettings } from "#/services/pricing-settings";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

type Db = WorkflowContext["db"];

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
  // A customer row is selling-side, a supplier row is buying-side, and a
  // generic row takes the side of its list (both sides for a both-list).
  const needsSalesCapability = draft.customerId !== null || draft.supplierId === null;
  const needsPurchaseCapability = draft.supplierId !== null || draft.customerId === null;
  if (coversSelling && needsSalesCapability && !item.is_sales_item) {
    throw new Error(`Item "${item.item_code}" is not a sales item.`);
  }
  if (coversBuying && needsPurchaseCapability && !item.is_purchase_item) {
    throw new Error(`Item "${item.item_code}" is not a purchase item.`);
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
    packing_unit: normalizePackingUnit(draft.packingUnit),
    price_list_id: draft.priceListId,
    rate: draft.rate,
    status: draft.status,
    supplier_id: draft.supplierId,
    uom,
    valid_from: validFrom,
    valid_upto: validUpto,
  };
}
