import { inventoryAdditionalCost } from "#/db-schemas/additional-cost";
import { inventoryBatch } from "#/db-schemas/batch";
import { inventoryPutawayRule } from "#/db-schemas/putaway-rule";
import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { inventorySerial } from "#/db-schemas/serial";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
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
  getAvailableQty,
  getEffectiveSetting,
  getLatestValuationRate,
  getOldestReceiptRate,
  getOnHandQty,
  getStockValuation,
  requireWarehouse,
} from "#/services/stock-service";
import type { DB, EffectiveSetting } from "#/services/stock-service";
import { STOCK_ENTRY_PURPOSE } from "#/utils/constants";

import { and, eq, sql } from "drizzle-orm";

export type StockEntryRow = typeof inventoryStockEntry.$inferSelect;
export type StockEntryItemRow = typeof inventoryStockEntryItem.$inferSelect;
export type AdditionalCostRow = typeof inventoryAdditionalCost.$inferSelect;

export interface PreparedSubmit {
  costs: AdditionalCostRow[];
  entry: StockEntryRow;
  items: StockEntryItemRow[];
  setting: EffectiveSetting;
}

export async function prepareSubmit(
  db: DB,
  entryId: string,
  actorRole: string | null,
): Promise<PreparedSubmit> {
  const [entry] = await db
    .select()
    .from(inventoryStockEntry)
    .where(eq(inventoryStockEntry.id, entryId))
    .limit(1);
  if (!entry) {
    throw new Error(`Stock entry "${entryId}" not found.`);
  }
  if (entry.status !== "draft") {
    throw new Error(`Only draft stock entries can be submitted (current: ${entry.status}).`);
  }
  const items = await db
    .select()
    .from(inventoryStockEntryItem)
    .where(eq(inventoryStockEntryItem.stock_entry_id, entryId));
  if (items.length === 0) {
    throw new Error("Cannot submit a stock entry without items.");
  }
  const costs = await db
    .select()
    .from(inventoryAdditionalCost)
    .where(eq(inventoryAdditionalCost.stock_entry_id, entryId));
  const setting = await getEffectiveSetting(db);
  assertFreezeAllowed(setting, entry.posting_date, actorRole);
  validateHeaderWarehouses(entry.purpose, entry.source_warehouse_id, entry.target_warehouse_id);
  return { costs, entry, items, setting };
}

export interface PostingLeg {
  allowNegative: boolean;
  basicRate: number;
  batchNo: string | null;
  entryItemId: string;
  isSample: boolean;
  isSerialTracked: boolean;
  itemId: string;
  qty: number;
  rate: number;
  salesOrderId: string | null;
  salesOrderItemId: string | null;
  serialNos: string[];
  valuationMethod: string;
  warehouseId: string;
  movement: "in" | "out";
}

export interface ComputedPosting {
  legs: PostingLeg[];
  putawaySplits: { itemId: string; qty: number; warehouseId: string }[];
}

function effectiveWarehouse(row: StockEntryItemRow, side: "source" | "target"): string | null {
  // Row warehouses are resolved against the header at creation time
  // (omitted fields inherit, explicit null opts out), so by submit time the
  // row carries its literal legs with no further fallback.
  if (side === "source") {
    return row.source_warehouse_id;
  }
  return row.target_warehouse_id;
}

export async function computePosting(db: DB, prepared: PreparedSubmit): Promise<ComputedPosting> {
  const { costs, entry, items, setting } = prepared;
  const putawaySplits: ComputedPosting["putawaySplits"] = [];

  if (entry.add_to_transit) {
    if (!entry.target_warehouse_id) {
      throw new Error("Add-to-transit transfers require a transit target warehouse.");
    }
    const target = await requireWarehouse(db, entry.target_warehouse_id);
    if (target.warehouse_type !== "transit") {
      throw new Error("Add-to-transit transfers require a transit-type target warehouse.");
    }
  }

  const legs: PostingLeg[] = [];
  // oxlint-disable eslint/no-await-in-loop
  for (const row of items) {
    const sourceId = effectiveWarehouse(row, "source");
    const targetId = effectiveWarehouse(row, "target");
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
    const resolvedBasic = basicRate ?? 0;
    const base = {
      allowNegative: row.allow_negative_stock ?? setting.allowNegativeStock,
      basicRate: resolvedBasic,
      batchNo: row.batch_no,
      entryItemId: row.id,
      isSample: false,
      isSerialTracked,
      itemId: row.item_id,
      qty: row.qty,
      rate: 0,
      salesOrderId: row.sales_order_id,
      salesOrderItemId: row.sales_order_item_id,
      serialNos: [...row.serial_nos],
      valuationMethod: row.valuation_method ?? setting.defaultValuationMethod,
    };
    if (sourceId) {
      await requireWarehouse(db, sourceId);
      legs.push({ ...base, movement: "out", warehouseId: sourceId });
    }
    if (targetId) {
      await requireWarehouse(db, targetId);
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
      if (retentionId) {
        await requireWarehouse(db, retentionId);
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

  const receiptLegs = legs.filter((leg) => leg.movement === "in");
  const issueLegs = legs.filter((leg) => leg.movement === "out");
  const totalAdditional = costs.reduce((sum, cost) => sum + (cost.amount ?? 0), 0);

  const isRollup =
    entry.purpose === STOCK_ENTRY_PURPOSE.REPACK ||
    entry.purpose === STOCK_ENTRY_PURPOSE.MANUFACTURE;

  for (const leg of issueLegs) {
    const valuation = await getStockValuation(db, leg.itemId, leg.warehouseId);
    const currentAvg = valuation.qty > 0 ? valuation.value / valuation.qty : 0;
    if (leg.valuationMethod === "fifo") {
      const oldest = await getOldestReceiptRate(db, leg.itemId, leg.warehouseId);
      const latest = await getLatestValuationRate(db, leg.itemId, leg.warehouseId);
      leg.rate = fifoIssueRate(oldest, latest ?? currentAvg);
    } else {
      leg.rate =
        currentAvg > 0
          ? currentAvg
          : ((await getLatestValuationRate(db, leg.itemId, leg.warehouseId)) ?? 0);
    }
    leg.basicRate = leg.rate;

    const allowNegative = entry.is_opening ? true : leg.allowNegative;
    if (leg.isSerialTracked || leg.batchNo) {
      const onHand = await getOnHandQty(db, leg.itemId, leg.warehouseId);
      if (onHand - leg.qty < 0) {
        throw new Error(
          `Insufficient stock for serial/batch item "${leg.itemId}" (negative stock is never allowed).`,
        );
      }
    } else if (!allowNegative) {
      const available = await getAvailableQty(db, leg.itemId, leg.warehouseId);
      if (available - leg.qty < 0) {
        throw new Error(
          `Insufficient stock for item "${leg.itemId}" in warehouse "${leg.warehouseId}".`,
        );
      }
    }

    if (leg.batchNo) {
      await assertBatchIssuable(db, {
        batchNo: leg.batchNo,
        itemId: leg.itemId,
        postingDateOnly: toDateOnly(entry.posting_date),
        qty: leg.qty,
        warehouseId: leg.warehouseId,
      });
    }
    if (leg.isSerialTracked) {
      await assertSerialsAvailable(db, {
        itemId: leg.itemId,
        serialNos: leg.serialNos,
        warehouseId: leg.warehouseId,
      });
    }
  }

  if (isRollup && issueLegs.length > 0 && receiptLegs.length > 0) {
    const inputValue =
      issueLegs.reduce((sum, leg) => sum + leg.qty * leg.rate, 0) + totalAdditional;
    const issuedQty = new Map<string, number>();
    const issuedValue = new Map<string, number>();
    for (const leg of issueLegs) {
      issuedQty.set(leg.itemId, (issuedQty.get(leg.itemId) ?? 0) + leg.qty);
      issuedValue.set(leg.itemId, (issuedValue.get(leg.itemId) ?? 0) + leg.qty * leg.rate);
    }
    // Receipts for items also issued in this entry are transfers carried at
    // cost; only genuinely new items absorb the rolled-up input value.
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
    const weights = newReceipts.map((leg) =>
      leg.basicRate > 0 ? leg.qty * leg.basicRate : leg.qty,
    );
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    newReceipts.forEach((leg, index) => {
      const weight = weights[index] ?? 0;
      const share =
        weightTotal > 0 ? (weight / weightTotal) * remaining : remaining / newReceipts.length;
      leg.rate = leg.qty > 0 ? share / leg.qty : 0;
    });
  } else {
    const basicAmounts = receiptLegs.map((leg) => leg.qty * leg.basicRate);
    const shares = distributeAdditionalCosts(basicAmounts, totalAdditional);
    for (const [index, leg] of receiptLegs.entries()) {
      const share = shares[index] ?? 0;
      // Receipt rows carry the transaction rate (basic + cost share). The
      // moving average is derived (value / qty), never stored on the row.
      leg.rate = leg.basicRate + (leg.qty > 0 ? share / leg.qty : 0);
    }
  }

  if (entry.apply_putaway_rule && receiptLegs.length > 0) {
    // Retain samples always route to the retention warehouse, never putaway.
    const putawayLegs = receiptLegs.filter((leg) => !leg.isSample);
    const originalReceiptCount = putawayLegs.length;
    for (let index = 0; index < originalReceiptCount; index += 1) {
      const leg = putawayLegs[index];
      if (!leg) {
        continue;
      }
      const rules = await db
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
        continue;
      }
      const capacities = [];
      for (const rule of rules) {
        const onHand = await getOnHandQty(db, leg.itemId, rule.warehouse_id);
        capacities.push({
          free: (rule.capacity ?? 0) - onHand,
          warehouseId: rule.warehouse_id,
        });
      }
      const splits = splitAcrossWarehouses(leg.qty, capacities);
      if (splits.length === 1 && splits[0]?.warehouseId === leg.warehouseId) {
        continue;
      }
      const [first] = splits;
      if (!first) {
        throw new Error("Putaway split produced no target warehouse.");
      }
      for (const split of splits) {
        putawaySplits.push({ itemId: leg.itemId, qty: split.qty, warehouseId: split.warehouseId });
      }
      leg.warehouseId = first.warehouseId;
      leg.qty = first.qty;
      for (const extra of splits.slice(1)) {
        legs.push({ ...leg, qty: extra.qty, warehouseId: extra.warehouseId });
      }
    }
  }
  // oxlint-enable eslint/no-await-in-loop

  return { legs, putawaySplits };
}

export interface BatchIssueCheck {
  batchNo: string;
  itemId: string;
  postingDateOnly: string;
  qty: number;
  warehouseId: string;
}

async function assertBatchIssuable(db: DB, check: BatchIssueCheck): Promise<void> {
  const { batchNo, itemId, postingDateOnly, qty, warehouseId } = check;
  const [batch] = await db
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
  const balance = await getBatchBalance(db, { batchNo, itemId, warehouseId });
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

export async function getBatchBalance(db: DB, query: BatchBalanceQuery): Promise<number> {
  const { batchNo, itemId, warehouseId } = query;
  const [balance] = await db
    .select({ total: sql<number>`coalesce(sum(${inventoryStockLedger.qty_delta}), 0)` })
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.item_id, itemId),
        eq(inventoryStockLedger.warehouse_id, warehouseId),
        eq(inventoryStockLedger.batch_no, batchNo),
      ),
    );
  return balance?.total ?? 0;
}

export interface SerialAvailabilityCheck {
  itemId: string;
  serialNos: string[];
  warehouseId: string;
}

export async function assertSerialsAvailable(
  db: DB,
  check: SerialAvailabilityCheck,
): Promise<void> {
  const { itemId, serialNos, warehouseId } = check;
  // oxlint-disable eslint/no-await-in-loop
  for (const serialNo of serialNos) {
    const [serial] = await db
      .select()
      .from(inventorySerial)
      .where(eq(inventorySerial.serial_no, serialNo))
      .limit(1);
    if (!serial || serial.item_id !== itemId) {
      throw new Error(`Serial "${serialNo}" does not exist for item "${itemId}".`);
    }
    if (serial.status !== "available" || serial.warehouse_id !== warehouseId) {
      throw new Error(`Serial "${serialNo}" is not available in warehouse "${warehouseId}".`);
    }
  }
  // oxlint-enable eslint/no-await-in-loop
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

export async function applyPosting(
  db: DB,
  application: PostingApplication,
): Promise<AppliedPosting> {
  const { autoReserve, computed, entry } = application;
  const ledgerIds: string[] = [];
  const autoReserved: AppliedPosting["autoReserved"] = [];
  const postingDate = toDateOnly(entry.posting_date);

  // oxlint-disable eslint/no-await-in-loop
  for (const leg of computed.legs) {
    const qtyDelta = leg.movement === "in" ? leg.qty : -leg.qty;
    const serials = leg.isSerialTracked ? leg.serialNos : [null];
    for (const serialNo of serials) {
      const unitQty = leg.isSerialTracked ? (leg.movement === "in" ? 1 : -1) : qtyDelta;
      const [ledger] = await db
        .insert(inventoryStockLedger)
        .values({
          batch_no: leg.batchNo,
          item_id: leg.itemId,
          posting_date: postingDate,
          posting_time: entry.posting_time,
          qty_delta: unitQty,
          serial_no: serialNo,
          stock_entry_id: entry.id,
          valuation_rate: leg.rate,
          voucher_id: entry.id,
          voucher_item_id: leg.entryItemId,
          voucher_type: "stock_entry",
          warehouse_id: leg.warehouseId,
        })
        .returning();
      if (ledger) {
        ledgerIds.push(ledger.id);
      }
    }

    if (leg.movement === "in") {
      if (leg.batchNo) {
        await ensureBatchExists(db, leg.itemId, leg.batchNo);
      }
      if (leg.isSerialTracked) {
        for (const serialNo of leg.serialNos) {
          await db.insert(inventorySerial).values({
            batch_no: leg.batchNo,
            item_id: leg.itemId,
            purchase_id: entry.id,
            serial_no: serialNo,
            status: "available",
            valuation_rate: leg.rate,
            warehouse_id: leg.warehouseId,
          });
        }
      }
      if (autoReserve && leg.salesOrderId) {
        const [reservation] = await db
          .insert(inventoryReservationEntry)
          .values({
            item_id: leg.itemId,
            reserved_qty: leg.qty,
            sales_order_id: leg.salesOrderId,
            sales_order_item_id: leg.salesOrderItemId,
            status: "reserved",
            warehouse_id: leg.warehouseId,
          })
          .returning();
        if (reservation) {
          autoReserved.push({ itemId: leg.itemId, qty: leg.qty, reservationId: reservation.id });
        }
      }
    } else {
      if (leg.isSerialTracked) {
        for (const serialNo of leg.serialNos) {
          await db
            .update(inventorySerial)
            .set({
              delivery_id: entry.id,
              status: "delivered",
              updated_at: new Date(),
              warehouse_id: null,
            })
            .where(eq(inventorySerial.serial_no, serialNo));
        }
      }
    }

    await db
      .update(inventoryStockEntryItem)
      .set({ valuation_rate: leg.rate })
      .where(eq(inventoryStockEntryItem.id, leg.entryItemId));
  }
  // oxlint-enable eslint/no-await-in-loop

  await db
    .update(inventoryStockEntry)
    .set({ status: "submitted", updated_at: new Date() })
    .where(eq(inventoryStockEntry.id, entry.id));

  return { autoReserved, ledgerIds };
}

export async function ensureBatchExists(db: DB, itemId: string, batchNo: string): Promise<void> {
  const [existing] = await db
    .select({ id: inventoryBatch.id })
    .from(inventoryBatch)
    .where(and(eq(inventoryBatch.item_id, itemId), eq(inventoryBatch.batch_id, batchNo)))
    .limit(1);
  if (!existing) {
    await db
      .insert(inventoryBatch)
      .values({ batch_id: batchNo, item_id: itemId, status: "active" });
  }
}

export async function reversePosting(db: DB, entryId: string): Promise<string[]> {
  const [entry] = await db
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
  const reversalIds = await reverseVoucher(db, {
    cancelVoucherType: "stock_entry_cancel",
    voucherId: entryId,
    voucherType: "stock_entry",
  });

  await db
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

export async function reverseVoucher(db: DB, reversal: VoucherReversal): Promise<string[]> {
  const { cancelVoucherType, voucherId, voucherType } = reversal;
  const originals = await db
    .select()
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.voucher_type, voucherType),
        eq(inventoryStockLedger.voucher_id, voucherId),
      ),
    );

  const reversalIds: string[] = [];
  // oxlint-disable eslint/no-await-in-loop
  for (const original of originals) {
    const [created] = await db
      .insert(inventoryStockLedger)
      .values({
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
      })
      .returning();
    if (created) {
      reversalIds.push(created.id);
    }
    if (original.serial_no) {
      const restore = original.qty_delta < 0;
      await db
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
    }
  }
  // oxlint-enable eslint/no-await-in-loop

  return reversalIds;
}

export async function requireDraftEntry(db: DB, entryId: string): Promise<StockEntryRow> {
  const [entry] = await db
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
