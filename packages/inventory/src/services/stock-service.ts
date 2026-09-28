import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { inventorySetting } from "#/db-schemas/setting";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { inventoryWarehouse } from "#/db-schemas/warehouse";
import { isFrozen, toDateOnly } from "#/services/stock-math";
import type { ValuationMethod } from "#/utils/constants";

import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type DB = PostgresJsDatabase;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;

// SAFETY: Transaction handles share the select/insert/update/delete/execute surface used below;
// this single coercion point keeps every query helper free of per-call assertions.
export function asDb(db: DbOrTx): DB {
  return db;
}

export interface EffectiveSetting {
  allowNegativeStock: boolean;
  autoReserveOnPurchase: boolean;
  defaultValuationMethod: ValuationMethod;
  enableStockReservation: boolean;
  freezeAllowedRole: string | null;
  freezeOlderThanDays: number | null;
  freezeUptoDate: string | null;
  sampleRetentionWarehouseId: string | null;
}

export async function getEffectiveSetting(db: DbOrTx): Promise<EffectiveSetting> {
  const handle = asDb(db);
  const [row] = await handle.select().from(inventorySetting).limit(1);
  return {
    allowNegativeStock: row?.allow_negative_stock ?? false,
    autoReserveOnPurchase: row?.auto_reserve_on_purchase ?? false,
    defaultValuationMethod: row?.default_valuation_method ?? "moving_average",
    enableStockReservation: row?.enable_stock_reservation ?? true,
    freezeAllowedRole: row?.freeze_allowed_role ?? null,
    freezeOlderThanDays: row?.freeze_older_than_days ?? null,
    freezeUptoDate: row?.freeze_upto_date ?? null,
    sampleRetentionWarehouseId: row?.sample_retention_warehouse_id ?? null,
  };
}

export function shouldAutoReserve(setting: EffectiveSetting): boolean {
  return setting.enableStockReservation && setting.autoReserveOnPurchase;
}

// oxlint-disable-next-line eslint/max-params -- 4th param is an optional test seam, splitting would worsen readability
export function assertFreezeAllowed(
  setting: EffectiveSetting,
  postingDate: string,
  actorRole: string | null,
  today: Date = new Date(),
): void {
  const todayOnly = toDateOnly(today.toISOString());
  const frozen = isFrozen(
    toDateOnly(postingDate),
    setting.freezeUptoDate,
    setting.freezeOlderThanDays,
    todayOnly,
  );
  if (!frozen) {
    return;
  }
  if (setting.freezeAllowedRole && actorRole === setting.freezeAllowedRole) {
    return;
  }
  throw new Error(`Posting date ${toDateOnly(postingDate)} is inside the frozen window.`);
}

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getOnHandQty(
  db: DbOrTx,
  itemId: string,
  warehouseId: string,
): Promise<number> {
  const handle = asDb(db);
  const [row] = await handle
    .select({ total: sql<string>`coalesce(sum(${inventoryStockLedger.qty_delta}), 0)` })
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.item_id, itemId),
        eq(inventoryStockLedger.warehouse_id, warehouseId),
      ),
    );
  return toNumber(row?.total);
}

export interface StockValuation {
  qty: number;
  value: number;
}

export async function getStockValuation(
  db: DbOrTx,
  itemId: string,
  warehouseId: string,
): Promise<StockValuation> {
  const handle = asDb(db);
  const [row] = await handle
    .select({
      qty: sql<string>`coalesce(sum(${inventoryStockLedger.qty_delta}), 0)`,
      value: sql<string>`coalesce(sum(${inventoryStockLedger.qty_delta} * ${inventoryStockLedger.valuation_rate}), 0)`,
    })
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.item_id, itemId),
        eq(inventoryStockLedger.warehouse_id, warehouseId),
      ),
    );
  return { qty: toNumber(row?.qty), value: toNumber(row?.value) };
}

export async function getReservedQty(
  db: DbOrTx,
  itemId: string,
  warehouseId: string,
): Promise<number> {
  const handle = asDb(db);
  const [row] = await handle
    .select({
      total: sql<string>`coalesce(sum(${inventoryReservationEntry.reserved_qty} - ${inventoryReservationEntry.delivered_qty}), 0)`,
    })
    .from(inventoryReservationEntry)
    .where(
      and(
        eq(inventoryReservationEntry.item_id, itemId),
        eq(inventoryReservationEntry.warehouse_id, warehouseId),
        sql`${inventoryReservationEntry.status} IN ('reserved', 'partially_delivered')`,
      ),
    );
  return toNumber(row?.total);
}

export async function getAvailableQty(
  db: DbOrTx,
  itemId: string,
  warehouseId: string,
): Promise<number> {
  const handle = asDb(db);
  const [onHand, reserved] = await Promise.all([
    getOnHandQty(handle, itemId, warehouseId),
    getReservedQty(handle, itemId, warehouseId),
  ]);
  return onHand - reserved;
}

export interface StockPair {
  itemId: string;
  warehouseId: string;
}

export interface StockState {
  available: number;
  onHand: number;
  reserved: number;
  value: number;
}

function stockKey(itemId: string, warehouseId: string): string {
  return `${itemId}::${warehouseId}`;
}

export async function getStockStates(
  db: DbOrTx,
  pairs: StockPair[],
): Promise<Map<string, StockState>> {
  const states = new Map<string, StockState>();
  for (const pair of pairs) {
    states.set(stockKey(pair.itemId, pair.warehouseId), {
      available: 0,
      onHand: 0,
      reserved: 0,
      value: 0,
    });
  }
  if (pairs.length === 0) {
    return states;
  }
  const handle = asDb(db);
  const filters = pairs.map((pair) =>
    and(
      eq(inventoryStockLedger.item_id, pair.itemId),
      eq(inventoryStockLedger.warehouse_id, pair.warehouseId),
    ),
  );
  const ledgerRows = await handle
    .select({
      itemId: inventoryStockLedger.item_id,
      qty: sql<string>`coalesce(sum(${inventoryStockLedger.qty_delta}), 0)`,
      value: sql<string>`coalesce(sum(${inventoryStockLedger.qty_delta} * ${inventoryStockLedger.valuation_rate}), 0)`,
      warehouseId: inventoryStockLedger.warehouse_id,
    })
    .from(inventoryStockLedger)
    .where(or(...filters))
    .groupBy(inventoryStockLedger.item_id, inventoryStockLedger.warehouse_id);
  for (const row of ledgerRows) {
    const key = stockKey(row.itemId, row.warehouseId);
    const current = states.get(key) ?? { available: 0, onHand: 0, reserved: 0, value: 0 };
    current.onHand = toNumber(row.qty);
    current.value = toNumber(row.value);
    states.set(key, current);
  }
  const reservationRows = await handle
    .select({
      itemId: inventoryReservationEntry.item_id,
      total: sql<string>`coalesce(sum(${inventoryReservationEntry.reserved_qty} - ${inventoryReservationEntry.delivered_qty}), 0)`,
      warehouseId: inventoryReservationEntry.warehouse_id,
    })
    .from(inventoryReservationEntry)
    .where(
      and(
        or(
          ...pairs.map((pair) =>
            and(
              eq(inventoryReservationEntry.item_id, pair.itemId),
              eq(inventoryReservationEntry.warehouse_id, pair.warehouseId),
            ),
          ),
        ),
        sql`${inventoryReservationEntry.status} IN ('reserved', 'partially_delivered')`,
      ),
    )
    .groupBy(inventoryReservationEntry.item_id, inventoryReservationEntry.warehouse_id);
  for (const row of reservationRows) {
    const key = stockKey(row.itemId, row.warehouseId);
    const current = states.get(key) ?? { available: 0, onHand: 0, reserved: 0, value: 0 };
    current.reserved = toNumber(row.total);
    states.set(key, current);
  }
  for (const state of states.values()) {
    state.available = state.onHand - state.reserved;
  }
  return states;
}

export async function getBatchBalances(
  db: DbOrTx,
  itemId: string,
  warehouseId: string,
  batchNos?: string[],
): Promise<Map<string, number>> {
  const handle = asDb(db);
  const balances = new Map<string, number>();
  const conditions = [
    eq(inventoryStockLedger.item_id, itemId),
    eq(inventoryStockLedger.warehouse_id, warehouseId),
    sql`${inventoryStockLedger.batch_no} IS NOT NULL`,
  ];
  if (batchNos && batchNos.length > 0) {
    conditions.push(inArray(inventoryStockLedger.batch_no, batchNos));
  }
  const rows = await handle
    .select({
      balance: sql<string>`sum(${inventoryStockLedger.qty_delta})`,
      batchNo: inventoryStockLedger.batch_no,
    })
    .from(inventoryStockLedger)
    .where(and(...conditions))
    .groupBy(inventoryStockLedger.batch_no);
  for (const row of rows) {
    if (!row.batchNo) {
      continue;
    }
    balances.set(row.batchNo, toNumber(row.balance));
  }
  return balances;
}

async function getBoundaryRate(
  db: DbOrTx,
  itemId: string,
  warehouseId: string,
  which: "latest" | "oldest",
): Promise<number | null> {
  const handle = asDb(db);
  const receiptOnly =
    which === "oldest"
      ? and(
          eq(inventoryStockLedger.item_id, itemId),
          eq(inventoryStockLedger.warehouse_id, warehouseId),
          sql`${inventoryStockLedger.qty_delta} > 0`,
        )
      : and(
          eq(inventoryStockLedger.item_id, itemId),
          eq(inventoryStockLedger.warehouse_id, warehouseId),
        );
  const ordering =
    which === "oldest"
      ? [inventoryStockLedger.posting_date, inventoryStockLedger.created_at]
      : [desc(inventoryStockLedger.posting_date), desc(inventoryStockLedger.created_at)];
  const [row] = await handle
    .select({ rate: inventoryStockLedger.valuation_rate })
    .from(inventoryStockLedger)
    .where(receiptOnly)
    .orderBy(...ordering)
    .limit(1);
  return row?.rate ?? null;
}

export async function getOldestReceiptRate(
  db: DbOrTx,
  itemId: string,
  warehouseId: string,
): Promise<number | null> {
  return getBoundaryRate(db, itemId, warehouseId, "oldest");
}

export async function getLatestValuationRate(
  db: DbOrTx,
  itemId: string,
  warehouseId: string,
): Promise<number | null> {
  return getBoundaryRate(db, itemId, warehouseId, "latest");
}

export interface WarehouseChecks {
  allowDisabled?: boolean;
  allowGroup?: boolean;
}

export async function requireWarehouse(
  db: DbOrTx,
  id: string,
  checks: WarehouseChecks = {},
): Promise<typeof inventoryWarehouse.$inferSelect> {
  const handle = asDb(db);
  const [warehouse] = await handle
    .select()
    .from(inventoryWarehouse)
    .where(eq(inventoryWarehouse.id, id))
    .limit(1);
  if (!warehouse) {
    throw new Error(`Warehouse "${id}" not found.`);
  }
  if (!checks.allowDisabled && warehouse.is_disabled) {
    throw new Error(`Warehouse "${warehouse.name}" is disabled.`);
  }
  if (!checks.allowGroup && warehouse.is_group) {
    throw new Error(`Warehouse "${warehouse.name}" is a group and cannot hold stock.`);
  }
  return warehouse;
}

export async function requireStockWarehouse(
  db: DbOrTx,
  id: string,
): Promise<typeof inventoryWarehouse.$inferSelect> {
  return requireWarehouse(db, id);
}

export async function requireGroupWarehouse(
  db: DbOrTx,
  id: string,
): Promise<typeof inventoryWarehouse.$inferSelect> {
  return requireWarehouse(db, id, { allowDisabled: true, allowGroup: true });
}

export async function hasLedgerHistory(db: DbOrTx, warehouseId: string): Promise<boolean> {
  const handle = asDb(db);
  const [row] = await handle
    .select({ id: inventoryStockLedger.id })
    .from(inventoryStockLedger)
    .where(eq(inventoryStockLedger.warehouse_id, warehouseId))
    .limit(1);
  return Boolean(row);
}

export async function hasChildren(db: DbOrTx, warehouseId: string): Promise<boolean> {
  const handle = asDb(db);
  const [row] = await handle
    .select({ id: inventoryWarehouse.id })
    .from(inventoryWarehouse)
    .where(eq(inventoryWarehouse.parent_id, warehouseId))
    .limit(1);
  return Boolean(row);
}
