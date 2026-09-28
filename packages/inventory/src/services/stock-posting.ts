import { inventoryAdditionalCost } from "#/db-schemas/additional-cost";
import { inventoryBatch } from "#/db-schemas/batch";
import { inventoryPutawayRule } from "#/db-schemas/putaway-rule";
import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { inventorySerial } from "#/db-schemas/serial";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { inventoryWarehouse } from "#/db-schemas/warehouse";
import {
  distributeAdditionalCosts,
  fifoIssueRate,
  splitAcrossWarehouses,
  toDateOnly,
  validateHeaderWarehouses,
  validateRowLegs,
} from "#/services/stock-math";
import {
  assertFreezeAllowed,
  getBatchBalances,
  getEffectiveSetting,
  getLatestValuationRate,
  getOldestReceiptRate,
  getStockStates,
  shouldAutoReserve,
  asDb,
} from "#/services/stock-service";
import type { DB, DbOrTx, EffectiveSetting, Tx } from "#/services/stock-service";
import { STOCK_ENTRY_PURPOSE, VALUATION_METHOD } from "#/utils/constants";
import type { ValuationMethod } from "#/utils/constants";

import { and, eq, inArray } from "drizzle-orm";

export type StockEntryRow = typeof inventoryStockEntry.$inferSelect;
export type StockEntryItemRow = typeof inventoryStockEntryItem.$inferSelect;
export type AdditionalCostRow = typeof inventoryAdditionalCost.$inferSelect;

export interface PreparedSubmit {
  costs: AdditionalCostRow[];
  entry: StockEntryRow;
  items: StockEntryItemRow[];
  setting: EffectiveSetting;
}

export async function requireDraftEntry(db: DbOrTx, entryId: string): Promise<StockEntryRow> {
  const handle = asDb(db);
  const [entry] = await handle
    .select()
    .from(inventoryStockEntry)
    .where(eq(inventoryStockEntry.id, entryId))
    .limit(1);
  if (!entry) {
    throw new Error(`Stock entry "${entryId}" not found.`);
  }
  if (entry.status !== "draft") {
    throw new Error(`Only draft stock entries can be edited (current: ${entry.status}).`);
  }
  return entry;
}

export async function prepareSubmit(
  db: DbOrTx,
  entryId: string,
  actorRole: string | null,
): Promise<PreparedSubmit> {
  const handle = asDb(db);
  const entry = await requireDraftEntry(handle, entryId);
  if (entry.status !== "draft") {
    throw new Error(`Only draft stock entries can be submitted (current: ${entry.status}).`);
  }
  const [items, costs, setting] = await Promise.all([
    handle
      .select()
      .from(inventoryStockEntryItem)
      .where(eq(inventoryStockEntryItem.stock_entry_id, entryId)),
    handle
      .select()
      .from(inventoryAdditionalCost)
      .where(eq(inventoryAdditionalCost.stock_entry_id, entryId)),
    getEffectiveSetting(handle),
  ]);
  if (items.length === 0) {
    throw new Error("Cannot submit a stock entry without items.");
  }
  assertFreezeAllowed(setting, entry.posting_date, actorRole);
  validateHeaderWarehouses(entry.purpose, entry.source_warehouse_id, entry.target_warehouse_id);
  return { costs, entry, items, setting };
}

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

export interface ComputedPosting {
  legs: PricedLeg[];
  putawaySplits: { itemId: string; qty: number; warehouseId: string }[];
}

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

function expandRowsToLegs(
  items: StockEntryItemRow[],
  entry: StockEntryRow,
  setting: EffectiveSetting,
): UnpricedLeg[] {
  const legs: UnpricedLeg[] = [];
  for (const row of items) {
    const sourceId = row.source_warehouse_id;
    const targetId = row.target_warehouse_id;
    validateRowLegs(entry.purpose, sourceId, targetId);
    if (row.qty <= 0) {
      throw new Error("Item quantity must be greater than zero.");
    }
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
    const basicRate = row.basic_rate ?? null;
    if (basicRate === null && !entry.allow_zero_valuation) {
      throw new Error(`Item "${row.item_id}" is missing a basic rate (or allow zero valuation).`);
    }
    const base = {
      allowNegative: row.allow_negative_stock ?? setting.allowNegativeStock,
      basicRate: basicRate ?? 0,
      batchNo: row.batch_no,
      entryItemId: row.id,
      isSample: false,
      isSerialTracked,
      itemId: row.item_id,
      salesOrderId: row.sales_order_id,
      salesOrderItemId: row.sales_order_item_id,
      serialNos: [...row.serial_nos],
      valuationMethod: resolveValuationMethod(row.valuation_method, setting.defaultValuationMethod),
    };
    if (sourceId) {
      legs.push({ ...base, movement: "out", qty: row.qty, warehouseId: sourceId });
    }
    if (targetId) {
      const sampleQty = row.sample_qty ?? 0;
      if (sampleQty < 0 || sampleQty > row.qty) {
        throw new Error("Sample quantity must be between zero and the row quantity.");
      }
      if (sampleQty > 0 && isSerialTracked) {
        throw new Error(
          "Serial-tracked rows cannot split retain samples; record the sample via a separate entry.",
        );
      }
      const retentionId = sampleQty > 0 ? setting.sampleRetentionWarehouseId : null;
      if (sampleQty > 0 && !retentionId) {
        throw new Error("Sample retention requires a sample retention warehouse in settings.");
      }
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
    }
  }
  if (legs.length === 0) {
    throw new Error("No stock movement legs resolved for this entry.");
  }
  return legs;
}

async function validateLegWarehouses(
  db: DbOrTx,
  legs: UnpricedLeg[],
  entry: StockEntryRow,
): Promise<void> {
  const handle = asDb(db);
  const ids = [...new Set(legs.map((leg) => leg.warehouseId))];
  if (entry.add_to_transit && entry.target_warehouse_id) {
    ids.push(entry.target_warehouse_id);
  }
  const uniqueIds = [...new Set(ids)];
  const rows =
    uniqueIds.length === 0
      ? []
      : await handle
          .select()
          .from(inventoryWarehouse)
          .where(inArray(inventoryWarehouse.id, uniqueIds));
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

async function priceIssueLegs(
  db: DbOrTx,
  legs: UnpricedLeg[],
  entry: StockEntryRow,
): Promise<PricedLeg[]> {
  const handle = asDb(db);
  const issueLegs = legs.filter((leg) => leg.movement === "out");
  if (issueLegs.length === 0) {
    return [];
  }
  const states = await getStockStates(
    handle,
    issueLegs.map((leg) => ({ itemId: leg.itemId, warehouseId: leg.warehouseId })),
  );
  const priced = await Promise.all(
    issueLegs.map(async (leg) => {
      const key = `${leg.itemId}::${leg.warehouseId}`;
      const state = states.get(key) ?? { available: 0, onHand: 0, reserved: 0, value: 0 };
      const currentAvg = state.onHand > 0 ? state.value / state.onHand : 0;
      let rate: number;
      if (leg.valuationMethod === VALUATION_METHOD.FIFO) {
        const [oldest, latest] = await Promise.all([
          getOldestReceiptRate(handle, leg.itemId, leg.warehouseId),
          getLatestValuationRate(handle, leg.itemId, leg.warehouseId),
        ]);
        rate = fifoIssueRate(oldest, latest ?? currentAvg);
      } else {
        if (currentAvg > 0) {
          rate = currentAvg;
        } else {
          rate = (await getLatestValuationRate(handle, leg.itemId, leg.warehouseId)) ?? 0;
        }
      }
      const allowNegative = resolveAllowNegative(entry, leg);
      if (leg.isSerialTracked || leg.batchNo) {
        if (state.onHand - leg.qty < 0) {
          throw new Error(
            `Insufficient stock for serial/batch item "${leg.itemId}" (negative stock is never allowed).`,
          );
        }
      } else if (!allowNegative) {
        if (state.available - leg.qty < 0) {
          throw new Error(
            `Insufficient stock for item "${leg.itemId}" in warehouse "${leg.warehouseId}".`,
          );
        }
      }
      return { ...leg, rate };
    }),
  );
  const batchChecks = priced.filter(
    (leg): leg is PricedLeg & { batchNo: string } => leg.batchNo !== null,
  );
  await Promise.all(
    batchChecks.map((leg) =>
      assertBatchIssuable(handle, {
        batchNo: leg.batchNo,
        itemId: leg.itemId,
        postingDateOnly: toDateOnly(entry.posting_date),
        qty: leg.qty,
        warehouseId: leg.warehouseId,
      }),
    ),
  );
  const serialChecks = priced.filter((leg) => leg.isSerialTracked);
  if (serialChecks.length > 0) {
    const allSerials = [...new Set(serialChecks.flatMap((leg) => leg.serialNos))];
    await assertSerialsAvailable(handle, {
      itemId: serialChecks[0]?.itemId ?? "",
      items: serialChecks.map((leg) => ({
        itemId: leg.itemId,
        serialNos: leg.serialNos,
        warehouseId: leg.warehouseId,
      })),
      serialNos: allSerials,
      warehouseId: serialChecks[0]?.warehouseId ?? "",
    });
  }
  return priced;
}

function priceStandardReceipts(receiptLegs: PricedLeg[], totalAdditional: number): void {
  const basicAmounts = receiptLegs.map((leg) => leg.qty * leg.basicRate);
  const shares = distributeAdditionalCosts(basicAmounts, totalAdditional);
  receiptLegs.forEach((leg, index) => {
    const share = shares[index] ?? 0;
    leg.rate = leg.basicRate + (leg.qty > 0 ? share / leg.qty : 0);
  });
}

function priceRollupReceipts(
  issueLegs: PricedLeg[],
  receiptLegs: PricedLeg[],
  totalAdditional: number,
): void {
  const inputValue = issueLegs.reduce((sum, leg) => sum + leg.qty * leg.rate, 0) + totalAdditional;
  const issuedQty = new Map<string, number>();
  const issuedValue = new Map<string, number>();
  for (const leg of issueLegs) {
    issuedQty.set(leg.itemId, (issuedQty.get(leg.itemId) ?? 0) + leg.qty);
    issuedValue.set(leg.itemId, (issuedValue.get(leg.itemId) ?? 0) + leg.qty * leg.rate);
  }
  const newReceipts = receiptLegs.filter((leg) => !issuedQty.has(leg.itemId));
  let transferValue = 0;
  for (const leg of receiptLegs) {
    const qty = issuedQty.get(leg.itemId) ?? 0;
    if (qty <= 0) {
      continue;
    }
    const value = issuedValue.get(leg.itemId) ?? 0;
    leg.rate = qty > 0 ? value / qty : 0;
    transferValue += leg.qty * leg.rate;
  }
  const remaining = inputValue - transferValue;
  const weights = newReceipts.map((leg) => (leg.basicRate > 0 ? leg.qty * leg.basicRate : leg.qty));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  newReceipts.forEach((leg, index) => {
    const weight = weights[index] ?? 0;
    const share =
      weightTotal > 0 ? (weight / weightTotal) * remaining : remaining / newReceipts.length;
    leg.rate = leg.qty > 0 ? share / leg.qty : 0;
  });
}

function priceReceiptLegs(
  issueLegs: PricedLeg[],
  receiptLegs: PricedLeg[],
  totalAdditional: number,
  entry: StockEntryRow,
): void {
  const isRollup =
    entry.purpose === STOCK_ENTRY_PURPOSE.REPACK ||
    entry.purpose === STOCK_ENTRY_PURPOSE.MANUFACTURE;
  if (isRollup && issueLegs.length > 0 && receiptLegs.length > 0) {
    priceRollupReceipts(issueLegs, receiptLegs, totalAdditional);
    return;
  }
  priceStandardReceipts(receiptLegs, totalAdditional);
}

async function applyPutawayToReceipts(
  db: DbOrTx,
  receiptLegs: PricedLeg[],
  entry: StockEntryRow,
): Promise<{ extraLegs: PricedLeg[]; splits: ComputedPosting["putawaySplits"] }> {
  const handle = asDb(db);
  const splits: ComputedPosting["putawaySplits"] = [];
  const extraLegs: PricedLeg[] = [];
  if (!entry.apply_putaway_rule || receiptLegs.length === 0) {
    return { extraLegs, splits };
  }
  const putawayLegs = receiptLegs.filter((leg) => !leg.isSample);
  await Promise.all(
    putawayLegs.map(async (leg) => {
      const rules = await handle
        .select()
        .from(inventoryPutawayRule)
        .where(
          and(
            eq(inventoryPutawayRule.item_id, leg.itemId),
            eq(inventoryPutawayRule.is_disabled, false),
          ),
        )
        .orderBy(inventoryPutawayRule.priority);
      if (rules.length === 0) {
        return;
      }
      const states = await getStockStates(
        handle,
        rules.map((rule) => ({ itemId: leg.itemId, warehouseId: rule.warehouse_id })),
      );
      const capacities = rules.map((rule) => {
        const onHand = states.get(`${leg.itemId}::${rule.warehouse_id}`)?.onHand ?? 0;
        return { capacity: rule.capacity - onHand, warehouseId: rule.warehouse_id };
      });
      const putawaySplits = splitAcrossWarehouses(leg.qty, capacities);
      if (putawaySplits.length === 1 && putawaySplits[0]?.warehouseId === leg.warehouseId) {
        return;
      }
      const [first] = putawaySplits;
      if (!first) {
        throw new Error("Putaway split produced no target warehouse.");
      }
      for (const split of putawaySplits) {
        splits.push({ itemId: leg.itemId, qty: split.qty, warehouseId: split.warehouseId });
      }
      leg.warehouseId = first.warehouseId;
      leg.qty = first.qty;
      for (const extra of putawaySplits.slice(1)) {
        extraLegs.push({ ...leg, qty: extra.qty, warehouseId: extra.warehouseId });
      }
    }),
  );
  return { extraLegs, splits };
}

export async function computePosting(
  db: DbOrTx,
  prepared: PreparedSubmit,
): Promise<ComputedPosting> {
  const handle = asDb(db);
  const { costs, entry, items, setting } = prepared;
  const unpriced = expandRowsToLegs(items, entry, setting);
  await validateLegWarehouses(handle, unpriced, entry);
  const pricedIssues = await priceIssueLegs(handle, unpriced, entry);
  const receiptUnpriced = unpriced.filter((leg) => leg.movement === "in");
  const receiptLegs: PricedLeg[] = receiptUnpriced.map((leg) => ({ ...leg, rate: leg.basicRate }));
  const totalAdditional = costs.reduce((sum, cost) => sum + (cost.amount ?? 0), 0);
  priceReceiptLegs(pricedIssues, receiptLegs, totalAdditional, entry);
  const { extraLegs, splits } = await applyPutawayToReceipts(handle, receiptLegs, entry);
  const legs = [...pricedIssues, ...receiptLegs, ...extraLegs];
  return { legs, putawaySplits: splits };
}

export interface BatchIssueCheck {
  batchNo: string;
  itemId: string;
  postingDateOnly: string;
  qty: number;
  warehouseId: string;
}

async function assertBatchIssuable(db: DbOrTx, check: BatchIssueCheck): Promise<void> {
  const handle = asDb(db);
  const { batchNo, itemId, postingDateOnly, qty, warehouseId } = check;
  const [batch] = await handle
    .select()
    .from(inventoryBatch)
    .where(and(eq(inventoryBatch.item_id, itemId), eq(inventoryBatch.batch_id, batchNo)))
    .limit(1);
  if (!batch) {
    throw new Error(`Batch "${batchNo}" for item "${itemId}" does not exist.`);
  }
  if (batch.status === "expired" || (batch.expiry_date && batch.expiry_date < postingDateOnly)) {
    throw new Error(`Batch "${batchNo}" is expired and cannot be issued.`);
  }
  const balances = await getBatchBalances(handle, itemId, warehouseId, [batchNo]);
  const balance = balances.get(batchNo) ?? 0;
  if (balance - qty < 0) {
    throw new Error(
      `Insufficient batch stock for batch "${batchNo}" (negative stock is never allowed).`,
    );
  }
}

export interface BatchBalanceQuery {
  batchNo: string;
  itemId: string;
  warehouseId: string;
}

export async function getBatchBalance(db: DbOrTx, query: BatchBalanceQuery): Promise<number> {
  const handle = asDb(db);
  const { batchNo, itemId, warehouseId } = query;
  const balances = await getBatchBalances(handle, itemId, warehouseId, [batchNo]);
  return balances.get(batchNo) ?? 0;
}

export interface SerialAvailabilityCheck {
  itemId: string;
  serialNos: string[];
  warehouseId: string;
  items?: { itemId: string; serialNos: string[]; warehouseId: string }[];
}

export async function assertSerialsAvailable(
  db: DbOrTx,
  check: SerialAvailabilityCheck,
): Promise<void> {
  const handle = asDb(db);
  const groups =
    check.items && check.items.length > 0
      ? check.items
      : [{ itemId: check.itemId, serialNos: check.serialNos, warehouseId: check.warehouseId }];
  const allSerials = [...new Set(groups.flatMap((group) => group.serialNos))];
  if (allSerials.length === 0) {
    return;
  }
  const rows = await handle
    .select()
    .from(inventorySerial)
    .where(inArray(inventorySerial.serial_no, allSerials));
  const byNo = new Map(rows.map((row) => [row.serial_no, row]));
  for (const group of groups) {
    for (const serialNo of group.serialNos) {
      const serial = byNo.get(serialNo);
      if (!serial || serial.item_id !== group.itemId) {
        throw new Error(`Serial "${serialNo}" does not exist for item "${group.itemId}".`);
      }
      if (serial.status !== "available" || serial.warehouse_id !== group.warehouseId) {
        throw new Error(
          `Serial "${serialNo}" is not available in warehouse "${group.warehouseId}".`,
        );
      }
    }
  }
}

export interface AppliedPosting {
  autoReserved: { itemId: string; qty: number; reservationId: string }[];
  ledgerIds: string[];
}

export interface PostingApplication {
  autoReserve: boolean;
  computed: ComputedPosting;
  entry: StockEntryRow;
}

function weightedRateByEntryItem(legs: PricedLeg[]): Map<string, number> {
  const qtyByItem = new Map<string, number>();
  const valueByItem = new Map<string, number>();
  for (const leg of legs) {
    qtyByItem.set(leg.entryItemId, (qtyByItem.get(leg.entryItemId) ?? 0) + leg.qty);
    valueByItem.set(leg.entryItemId, (valueByItem.get(leg.entryItemId) ?? 0) + leg.qty * leg.rate);
  }
  const rates = new Map<string, number>();
  for (const [entryItemId, qty] of qtyByItem) {
    const value = valueByItem.get(entryItemId) ?? 0;
    rates.set(entryItemId, qty > 0 ? value / qty : 0);
  }
  return rates;
}

export async function applyPosting(
  db: DbOrTx,
  application: PostingApplication,
): Promise<AppliedPosting> {
  const handle = asDb(db);
  const { autoReserve, computed, entry } = application;
  const postingDate = toDateOnly(entry.posting_date);

  const ledgerValues: (typeof inventoryStockLedger.$inferInsert)[] = computed.legs.flatMap(
    (leg): (typeof inventoryStockLedger.$inferInsert)[] => {
      const qtyDelta = leg.movement === "in" ? leg.qty : -leg.qty;
      if (leg.isSerialTracked) {
        return leg.serialNos.map((serialNo) => ({
          batch_no: leg.batchNo,
          item_id: leg.itemId,
          posting_date: postingDate,
          posting_time: entry.posting_time,
          qty_delta: leg.movement === "in" ? 1 : -1,
          serial_no: serialNo,
          stock_entry_id: entry.id,
          valuation_rate: leg.rate,
          voucher_id: entry.id,
          voucher_item_id: leg.entryItemId,
          voucher_type: "stock_entry",
          warehouse_id: leg.warehouseId,
        }));
      }
      return [
        {
          batch_no: leg.batchNo,
          item_id: leg.itemId,
          posting_date: postingDate,
          posting_time: entry.posting_time,
          qty_delta: qtyDelta,
          serial_no: null,
          stock_entry_id: entry.id,
          valuation_rate: leg.rate,
          voucher_id: entry.id,
          voucher_item_id: leg.entryItemId,
          voucher_type: "stock_entry",
          warehouse_id: leg.warehouseId,
        },
      ];
    },
  );
  const insertedLedgers =
    ledgerValues.length === 0
      ? []
      : await handle
          .insert(inventoryStockLedger)
          .values(ledgerValues)
          .returning({ id: inventoryStockLedger.id });
  const ledgerIds = insertedLedgers.map((row) => row.id);

  const receiptLegs = computed.legs.filter((leg) => leg.movement === "in");
  const batchesToEnsure = new Map<string, { batchNo: string; itemId: string }>();
  for (const leg of receiptLegs) {
    if (leg.batchNo) {
      batchesToEnsure.set(`${leg.itemId}::${leg.batchNo}`, {
        batchNo: leg.batchNo,
        itemId: leg.itemId,
      });
    }
  }
  await Promise.all(
    [...batchesToEnsure.values()].map((entry) =>
      ensureBatchExists(handle, entry.itemId, entry.batchNo),
    ),
  );

  const serialInserts: (typeof inventorySerial.$inferInsert)[] = receiptLegs
    .filter((leg) => leg.isSerialTracked)
    .flatMap((leg) =>
      leg.serialNos.map((serialNo) => ({
        batch_no: leg.batchNo,
        item_id: leg.itemId,
        purchase_id: entry.id,
        serial_no: serialNo,
        status: "available" as const,
        valuation_rate: leg.rate,
        warehouse_id: leg.warehouseId,
      })),
    );
  if (serialInserts.length > 0) {
    await handle.insert(inventorySerial).values(serialInserts).onConflictDoNothing();
  }
  const serialDeliveries = computed.legs.filter(
    (leg) => leg.movement === "out" && leg.isSerialTracked,
  );
  await Promise.all(
    serialDeliveries.map((leg) =>
      Promise.all(
        leg.serialNos.map((serialNo) =>
          handle
            .update(inventorySerial)
            .set({
              delivery_id: entry.id,
              status: "delivered",
              updated_at: new Date(),
              warehouse_id: null,
            })
            .where(eq(inventorySerial.serial_no, serialNo)),
        ),
      ),
    ),
  );

  const autoReserved: AppliedPosting["autoReserved"] = [];
  if (autoReserve) {
    const reservable = receiptLegs.filter((leg) => leg.salesOrderId);
    if (reservable.length > 0) {
      const inserted = await handle
        .insert(inventoryReservationEntry)
        .values(
          reservable.map((leg) => ({
            item_id: leg.itemId,
            reserved_qty: leg.qty,
            sales_order_id: leg.salesOrderId,
            sales_order_item_id: leg.salesOrderItemId,
            status: "reserved" as const,
            warehouse_id: leg.warehouseId,
          })),
        )
        .returning({
          id: inventoryReservationEntry.id,
          item_id: inventoryReservationEntry.item_id,
        });
      const qtyById = new Map<string, number>();
      for (const leg of reservable) {
        qtyById.set(leg.itemId, leg.qty);
      }
      for (const row of inserted) {
        autoReserved.push({
          itemId: row.item_id,
          qty: qtyById.get(row.item_id) ?? 0,
          reservationId: row.id,
        });
      }
    }
  }

  const rates = weightedRateByEntryItem(computed.legs);
  await Promise.all(
    [...rates].map(([entryItemId, rate]) =>
      handle
        .update(inventoryStockEntryItem)
        .set({ valuation_rate: rate })
        .where(eq(inventoryStockEntryItem.id, entryItemId)),
    ),
  );

  await handle
    .update(inventoryStockEntry)
    .set({ status: "submitted", updated_at: new Date() })
    .where(eq(inventoryStockEntry.id, entry.id));

  return { autoReserved, ledgerIds };
}

export async function submitEntry(
  db: DB,
  entryId: string,
  actorRole: string | null,
): Promise<{ applied: AppliedPosting; computed: ComputedPosting; entry: StockEntryRow }> {
  return db.transaction(async (tx: Tx) => {
    const handle = asDb(tx);
    const prepared = await prepareSubmit(handle, entryId, actorRole);
    const computed = await computePosting(handle, prepared);
    const applied = await applyPosting(handle, {
      autoReserve: shouldAutoReserve(prepared.setting),
      computed,
      entry: prepared.entry,
    });
    return { applied, computed, entry: prepared.entry };
  });
}

export async function ensureBatchExists(
  db: DbOrTx,
  itemId: string,
  batchNo: string,
): Promise<void> {
  const handle = asDb(db);
  await handle
    .insert(inventoryBatch)
    .values({ batch_id: batchNo, item_id: itemId, status: "active" })
    .onConflictDoNothing({ target: [inventoryBatch.item_id, inventoryBatch.batch_id] });
}

export async function reversePosting(db: DbOrTx, entryId: string): Promise<string[]> {
  const handle = asDb(db);
  const [entry] = await handle
    .select()
    .from(inventoryStockEntry)
    .where(eq(inventoryStockEntry.id, entryId))
    .limit(1);
  if (!entry) {
    throw new Error(`Stock entry "${entryId}" not found.`);
  }
  if (entry.status !== "submitted") {
    throw new Error("Only submitted stock entries can be cancelled.");
  }
  const reversalIds = await reverseVoucher(handle, {
    cancelVoucherType: "stock_entry_cancel",
    voucherId: entryId,
    voucherType: "stock_entry",
  });

  await handle
    .update(inventoryStockEntry)
    .set({ status: "cancelled", updated_at: new Date() })
    .where(eq(inventoryStockEntry.id, entryId));

  return reversalIds;
}

export interface VoucherReversal {
  cancelVoucherType: string;
  voucherId: string;
  voucherType: string;
}

export async function reverseVoucher(db: DbOrTx, reversal: VoucherReversal): Promise<string[]> {
  const handle = asDb(db);
  const { cancelVoucherType, voucherId, voucherType } = reversal;
  const originals = await handle
    .select()
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.voucher_type, voucherType),
        eq(inventoryStockLedger.voucher_id, voucherId),
      ),
    );

  if (originals.length === 0) {
    return [];
  }
  const inserted = await handle
    .insert(inventoryStockLedger)
    .values(
      originals.map((original) => ({
        batch_no: original.batch_no,
        item_id: original.item_id,
        posting_date: original.posting_date,
        posting_time: original.posting_time,
        qty_delta: -original.qty_delta,
        serial_no: original.serial_no,
        stock_entry_id: voucherType === "stock_entry" ? voucherId : original.stock_entry_id,
        valuation_rate: original.valuation_rate,
        voucher_id: voucherId,
        voucher_item_id: original.voucher_item_id,
        voucher_type: cancelVoucherType,
        warehouse_id: original.warehouse_id,
      })),
    )
    .returning({ id: inventoryStockLedger.id });
  const reversalIds = inserted.map((row) => row.id);
  const serialed = originals.filter(
    (original): original is typeof original & { serial_no: string } => original.serial_no !== null,
  );
  await Promise.all(
    serialed.map((original) => {
      const restore = original.qty_delta < 0;
      return handle
        .update(inventorySerial)
        .set(
          restore
            ? {
                delivery_id: null,
                status: "available",
                updated_at: new Date(),
                warehouse_id: original.warehouse_id,
              }
            : { status: "cancelled", updated_at: new Date() },
        )
        .where(eq(inventorySerial.serial_no, original.serial_no));
    }),
  );

  return reversalIds;
}
