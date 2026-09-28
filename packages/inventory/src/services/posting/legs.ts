import { inventoryWarehouse } from "#/db-schemas/warehouse";
import type { StockEntryItemRow, StockEntryRow } from "#/services/posting/types";
import { validateRowLegs } from "#/services/stock-math";
import type { DbOrTx, EffectiveSetting } from "#/services/stock-service";
import type { ValuationMethod } from "#/utils/constants";
import { STOCK_ENTRY_PURPOSE, VALUATION_METHOD } from "#/utils/constants";

import { inArray } from "drizzle-orm";

export interface UnpricedLeg {
  allowNegative: boolean;
  basicRate: number;
  batchNo: string | null;
  entryItemId: string;
  isSample: boolean;
  isSerialTracked: boolean;
  itemId: string;
  qty: number;
  salesOrderId: string | null;
  salesOrderItemId: string | null;
  serialNos: string[];
  valuationMethod: ValuationMethod;
  warehouseId: string;
  movement: "in" | "out";
}

export interface PricedLeg extends UnpricedLeg {
  rate: number;
}

export type PostingLeg = PricedLeg;

function resolveValuationMethod(raw: string | null, fallback: ValuationMethod): ValuationMethod {
  if (raw === VALUATION_METHOD.FIFO || raw === VALUATION_METHOD.MOVING_AVERAGE) {
    return raw;
  }
  return fallback;
}

function resolveAllowNegative(
  entry: StockEntryRow,
  leg: Pick<UnpricedLeg, "allowNegative">,
): boolean {
  if (entry.is_opening) {
    return true;
  }
  return leg.allowNegative;
}

export function isRollupPurpose(purpose: StockEntryRow["purpose"]): boolean {
  return purpose === STOCK_ENTRY_PURPOSE.REPACK || purpose === STOCK_ENTRY_PURPOSE.MANUFACTURE;
}

interface RowBase {
  allowNegative: boolean;
  basicRate: number;
  batchNo: string | null;
  entryItemId: string;
  isSerialTracked: boolean;
  itemId: string;
  salesOrderId: string | null;
  salesOrderItemId: string | null;
  serialNos: string[];
  valuationMethod: ValuationMethod;
}

function toRowBase(row: StockEntryItemRow, setting: EffectiveSetting): RowBase {
  const isSerialTracked = row.requires_serial ?? false;
  if (isSerialTracked) {
    if (!Number.isInteger(row.qty)) {
      throw new Error("Serial-tracked items require an integer quantity.");
    }
    if (row.serial_nos.length !== row.qty) {
      throw new Error(
        `Serial-tracked item "${row.item_id}" needs exactly one serial number per unit.`,
      );
    }
  }
  if ((row.requires_batch ?? false) && !row.batch_no) {
    throw new Error(`Batch-tracked item "${row.item_id}" requires a batch number.`);
  }
  return {
    allowNegative: row.allow_negative_stock ?? setting.allowNegativeStock,
    basicRate: row.basic_rate ?? 0,
    batchNo: row.batch_no,
    entryItemId: row.id,
    isSerialTracked,
    itemId: row.item_id,
    salesOrderId: row.sales_order_id,
    salesOrderItemId: row.sales_order_item_id,
    serialNos: [...row.serial_nos],
    valuationMethod: resolveValuationMethod(row.valuation_method, setting.defaultValuationMethod),
  };
}

function assertBasicRate(row: StockEntryItemRow, entry: StockEntryRow): void {
  if (row.basic_rate === null && !entry.allow_zero_valuation) {
    throw new Error(`Item "${row.item_id}" is missing a basic rate (or allow zero valuation).`);
  }
}

function splitSampleLegs(
  row: StockEntryItemRow,
  base: RowBase,
  targetId: string,
  setting: EffectiveSetting,
): UnpricedLeg[] {
  const sampleQty = row.sample_qty ?? 0;
  if (sampleQty < 0 || sampleQty > row.qty) {
    throw new Error("Sample quantity must be between zero and the row quantity.");
  }
  if (sampleQty > 0 && base.isSerialTracked) {
    throw new Error(
      "Serial-tracked rows cannot split retain samples; record the sample via a separate entry.",
    );
  }
  const retentionId = sampleQty > 0 ? setting.sampleRetentionWarehouseId : null;
  if (sampleQty > 0 && !retentionId) {
    throw new Error("Sample retention requires a sample retention warehouse in settings.");
  }
  const legs: UnpricedLeg[] = [];
  const mainQty = row.qty - sampleQty;
  if (mainQty > 0) {
    legs.push({
      ...base,
      isSample: false,
      movement: "in",
      qty: mainQty,
      warehouseId: targetId,
    });
  }
  if (sampleQty > 0 && retentionId) {
    legs.push({
      ...base,
      isSample: true,
      movement: "in",
      qty: sampleQty,
      salesOrderId: null,
      salesOrderItemId: null,
      serialNos: [],
      warehouseId: retentionId,
    });
  }
  return legs;
}

export function expandRowToLegs(
  row: StockEntryItemRow,
  entry: StockEntryRow,
  setting: EffectiveSetting,
): UnpricedLeg[] {
  const sourceId = row.source_warehouse_id;
  const targetId = row.target_warehouse_id;
  validateRowLegs(entry.purpose, sourceId, targetId);
  if (row.qty <= 0) {
    throw new Error("Item quantity must be greater than zero.");
  }
  const base = toRowBase(row, setting);
  assertBasicRate(row, entry);
  const legs: UnpricedLeg[] = [];
  if (sourceId) {
    legs.push({ ...base, isSample: false, movement: "out", qty: row.qty, warehouseId: sourceId });
  }
  if (targetId) {
    legs.push(...splitSampleLegs(row, base, targetId, setting));
  }
  return legs;
}

export function expandRowsToLegs(
  items: StockEntryItemRow[],
  entry: StockEntryRow,
  setting: EffectiveSetting,
): UnpricedLeg[] {
  const legs = items.flatMap((row) => expandRowToLegs(row, entry, setting));
  if (legs.length === 0) {
    throw new Error("No stock movement legs resolved for this entry.");
  }
  return legs;
}

export function resolveIssueAllowance(entry: StockEntryRow, leg: UnpricedLeg): boolean {
  return resolveAllowNegative(entry, leg);
}

export async function validateLegWarehouses(
  db: DbOrTx,
  legs: UnpricedLeg[],
  entry: StockEntryRow,
): Promise<void> {
  const ids = [...new Set(legs.map((leg) => leg.warehouseId))];
  if (entry.add_to_transit && entry.target_warehouse_id) {
    ids.push(entry.target_warehouse_id);
  }
  const uniqueIds = [...new Set(ids)];
  const rows =
    uniqueIds.length === 0
      ? []
      : await db.select().from(inventoryWarehouse).where(inArray(inventoryWarehouse.id, uniqueIds));
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of uniqueIds) {
    const warehouse = byId.get(id);
    if (!warehouse) {
      throw new Error(`Warehouse "${id}" not found.`);
    }
    if (warehouse.is_disabled) {
      throw new Error(`Warehouse "${warehouse.name}" is disabled.`);
    }
    if (warehouse.is_group) {
      throw new Error(`Warehouse "${warehouse.name}" is a group and cannot hold stock.`);
    }
  }
  if (entry.add_to_transit) {
    if (!entry.target_warehouse_id) {
      throw new Error("Add-to-transit transfers require a transit target warehouse.");
    }
    const target = byId.get(entry.target_warehouse_id);
    if (target?.warehouse_type !== "transit") {
      throw new Error("Add-to-transit transfers require a transit-type target warehouse.");
    }
  }
}
