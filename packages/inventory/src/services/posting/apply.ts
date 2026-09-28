import { inventoryBatch } from "#/db-schemas/batch";
import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { inventorySerial } from "#/db-schemas/serial";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import type { ComputedPosting } from "#/services/posting/compute";
import { computePosting } from "#/services/posting/compute";
import type { PricedLeg } from "#/services/posting/legs";
import { prepareSubmit } from "#/services/posting/types";
import type { StockEntryRow } from "#/services/posting/types";
import { toDateOnly } from "#/services/stock-math";
import { shouldAutoReserve } from "#/services/stock-service";
import type { DB, DbOrTx, Tx } from "#/services/stock-service";

import { eq } from "drizzle-orm";

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

export async function ensureBatchExists(
  db: DbOrTx,
  itemId: string,
  batchNo: string,
): Promise<void> {
  await db
    .insert(inventoryBatch)
    .values({ batch_id: batchNo, item_id: itemId, status: "active" })
    .onConflictDoNothing({ target: [inventoryBatch.item_id, inventoryBatch.batch_id] });
}

function ledgerRowsForLeg(
  leg: PricedLeg,
  entry: StockEntryRow,
  postingDate: string,
): (typeof inventoryStockLedger.$inferInsert)[] {
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
      qty_delta: leg.movement === "in" ? leg.qty : -leg.qty,
      serial_no: null,
      stock_entry_id: entry.id,
      valuation_rate: leg.rate,
      voucher_id: entry.id,
      voucher_item_id: leg.entryItemId,
      voucher_type: "stock_entry",
      warehouse_id: leg.warehouseId,
    },
  ];
}

async function insertLedgerLegs(
  db: DbOrTx,
  legs: PricedLeg[],
  entry: StockEntryRow,
  postingDate: string,
): Promise<string[]> {
  const ledgerValues = legs.flatMap((leg) => ledgerRowsForLeg(leg, entry, postingDate));
  if (ledgerValues.length === 0) {
    return [];
  }
  const inserted = await db
    .insert(inventoryStockLedger)
    .values(ledgerValues)
    .returning({ id: inventoryStockLedger.id });
  return inserted.map((row) => row.id);
}

async function ensureReceiptBatches(db: DbOrTx, receiptLegs: PricedLeg[]): Promise<void> {
  const batchesToEnsure = new Map<string, { batchNo: string; itemId: string }>();
  for (const leg of receiptLegs) {
    if (leg.batchNo) {
      batchesToEnsure.set(`${leg.itemId}::${leg.batchNo}`, {
        batchNo: leg.batchNo,
        itemId: leg.itemId,
      });
    }
  }
  for (const batch of batchesToEnsure.values()) {
    await ensureBatchExists(db, batch.itemId, batch.batchNo);
  }
}

async function insertReceiptSerials(
  db: DbOrTx,
  receiptLegs: PricedLeg[],
  entry: StockEntryRow,
): Promise<void> {
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
    await db.insert(inventorySerial).values(serialInserts).onConflictDoNothing();
  }
}

async function deliverIssueSerials(
  db: DbOrTx,
  legs: PricedLeg[],
  entry: StockEntryRow,
): Promise<void> {
  const serialDeliveries = legs.filter((leg) => leg.movement === "out" && leg.isSerialTracked);
  for (const leg of serialDeliveries) {
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

async function insertAutoReservations(
  db: DbOrTx,
  receiptLegs: PricedLeg[],
): Promise<AppliedPosting["autoReserved"]> {
  const reservable = receiptLegs.filter((leg) => leg.salesOrderId);
  if (reservable.length === 0) {
    return [];
  }
  const inserted = await db
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
  return inserted.map((row, index) => ({
    itemId: row.item_id,
    qty: reservable[index]?.qty ?? 0,
    reservationId: row.id,
  }));
}

async function backfillItemRates(db: DbOrTx, legs: PricedLeg[]): Promise<void> {
  const rates = weightedRateByEntryItem(legs);
  for (const [entryItemId, rate] of rates) {
    await db
      .update(inventoryStockEntryItem)
      .set({ valuation_rate: rate })
      .where(eq(inventoryStockEntryItem.id, entryItemId));
  }
}

export async function applyPosting(
  db: DbOrTx,
  application: PostingApplication,
): Promise<AppliedPosting> {
  const { autoReserve, computed, entry } = application;
  const postingDate = toDateOnly(entry.posting_date);

  const ledgerIds = await insertLedgerLegs(db, computed.legs, entry, postingDate);
  const receiptLegs = computed.legs.filter((leg) => leg.movement === "in");
  await ensureReceiptBatches(db, receiptLegs);
  await insertReceiptSerials(db, receiptLegs, entry);
  await deliverIssueSerials(db, computed.legs, entry);

  const autoReserved = autoReserve ? await insertAutoReservations(db, receiptLegs) : [];
  await backfillItemRates(db, computed.legs);

  await db
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
    const prepared = await prepareSubmit(tx, entryId, actorRole);
    const computed = await computePosting(tx, prepared);
    const applied = await applyPosting(tx, {
      autoReserve: shouldAutoReserve(prepared.setting),
      computed,
      entry: prepared.entry,
    });
    return { applied, computed, entry: prepared.entry };
  });
}
