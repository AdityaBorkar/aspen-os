import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { inventorySetting } from "#/db-schemas/setting";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { inventoryWarehouse } from "#/db-schemas/warehouse";
import { isFrozen, toDateOnly } from "#/services/stock-math";
import type { ValuationMethod } from "#/utils/constants";

import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type DB = PostgresJsDatabase;

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

export async function getEffectiveSetting(db: DB): Promise<EffectiveSetting> {
  const [row] = await db.select().from(inventorySetting).limit(1);
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

export async function getOnHandQty(db: DB, itemId: string, warehouseId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${inventoryStockLedger.qty_delta}), 0)` })
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.item_id, itemId),
        eq(inventoryStockLedger.warehouse_id, warehouseId),
      ),
    );
  return row?.total ?? 0;
}

export interface StockValuation {
  qty: number;
  value: number;
}

export async function getStockValuation(
  db: DB,
  itemId: string,
  warehouseId: string,
): Promise<StockValuation> {
  const [row] = await db
    .select({
      qty: sql<number>`coalesce(sum(${inventoryStockLedger.qty_delta}), 0)`,
      value: sql<number>`coalesce(sum(${inventoryStockLedger.qty_delta} * ${inventoryStockLedger.valuation_rate}), 0)`,
    })
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.item_id, itemId),
        eq(inventoryStockLedger.warehouse_id, warehouseId),
      ),
    );
  return { qty: row?.qty ?? 0, value: row?.value ?? 0 };
}

export async function getReservedQty(db: DB, itemId: string, warehouseId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${inventoryReservationEntry.reserved_qty} - ${inventoryReservationEntry.delivered_qty}), 0)`,
    })
    .from(inventoryReservationEntry)
    .where(
      and(
        eq(inventoryReservationEntry.item_id, itemId),
        eq(inventoryReservationEntry.warehouse_id, warehouseId),
        sql`${inventoryReservationEntry.status} IN ('reserved', 'partially_delivered')`,
      ),
    );
  return row?.total ?? 0;
}

export async function getAvailableQty(
  db: DB,
  itemId: string,
  warehouseId: string,
): Promise<number> {
  const [onHand, reserved] = await Promise.all([
    getOnHandQty(db, itemId, warehouseId),
    getReservedQty(db, itemId, warehouseId),
  ]);
  return onHand - reserved;
}

export async function getOldestReceiptRate(
  db: DB,
  itemId: string,
  warehouseId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ rate: inventoryStockLedger.valuation_rate })
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.item_id, itemId),
        eq(inventoryStockLedger.warehouse_id, warehouseId),
        sql`${inventoryStockLedger.qty_delta} > 0`,
      ),
    )
    .orderBy(inventoryStockLedger.posting_date, inventoryStockLedger.created_at)
    .limit(1);
  return row?.rate ?? null;
}

export async function getLatestValuationRate(
  db: DB,
  itemId: string,
  warehouseId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ rate: inventoryStockLedger.valuation_rate })
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.item_id, itemId),
        eq(inventoryStockLedger.warehouse_id, warehouseId),
      ),
    )
    .orderBy(inventoryStockLedger.posting_date, inventoryStockLedger.created_at)
    .limit(1);
  return row?.rate ?? null;
}

export interface WarehouseChecks {
  allowDisabled?: boolean;
  allowGroup?: boolean;
}

export async function requireWarehouse(
  db: DB,
  id: string,
  checks: WarehouseChecks = {},
): Promise<typeof inventoryWarehouse.$inferSelect> {
  const [warehouse] = await db
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

export async function hasLedgerHistory(db: DB, warehouseId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: inventoryStockLedger.id })
    .from(inventoryStockLedger)
    .where(eq(inventoryStockLedger.warehouse_id, warehouseId))
    .limit(1);
  return Boolean(row);
}

export async function hasChildren(db: DB, warehouseId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: inventoryWarehouse.id })
    .from(inventoryWarehouse)
    .where(eq(inventoryWarehouse.parent_id, warehouseId))
    .limit(1);
  return Boolean(row);
}
