import { inventoryBatch } from "#/db-schemas/batch";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { inventoryWarehouse } from "#/db-schemas/warehouse";
import type { DB } from "#/services/stock-service";

import { and, eq, inArray, sql } from "drizzle-orm";

export interface SuggestRequestItem {
  batchNo?: string | null;
  itemId: string;
  qty: number;
}

export interface SuggestRequest {
  items: SuggestRequestItem[];
  parentWarehouseId?: string | null;
}

export interface SuggestedLine {
  availableQty: number;
  batchNo: string | null;
  itemId: string;
  qty: number;
  unallocatedQty: number;
  warehouseId: string | null;
}

interface WarehouseCandidate {
  firstReceipt: string;
  onHand: number;
  warehouseId: string;
}

async function oldestStockWarehouses(db: DB, itemId: string): Promise<WarehouseCandidate[]> {
  const rows = await db
    .select({
      firstReceipt: sql<string>`min(${inventoryStockLedger.created_at})`,
      onHand: sql<string>`sum(${inventoryStockLedger.qty_delta})`,
      warehouseId: inventoryStockLedger.warehouse_id,
    })
    .from(inventoryStockLedger)
    .where(eq(inventoryStockLedger.item_id, itemId))
    .groupBy(inventoryStockLedger.warehouse_id)
    .orderBy(sql`min(${inventoryStockLedger.created_at})`);
  return rows.flatMap((row) => {
    const onHand = Number(row.onHand ?? 0);
    if (onHand <= 0) {
      return [];
    }
    return [{ firstReceipt: row.firstReceipt, onHand, warehouseId: row.warehouseId }];
  });
}

async function batchBalances(
  db: DB,
  itemId: string,
  warehouseId: string,
): Promise<{ balance: number; batchNo: string }[]> {
  const rows = await db
    .select({
      balance: sql<string>`sum(${inventoryStockLedger.qty_delta})`,
      batchNo: inventoryStockLedger.batch_no,
    })
    .from(inventoryStockLedger)
    .where(
      and(
        eq(inventoryStockLedger.item_id, itemId),
        eq(inventoryStockLedger.warehouse_id, warehouseId),
        sql`${inventoryStockLedger.batch_no} IS NOT NULL`,
      ),
    )
    .groupBy(inventoryStockLedger.batch_no);
  return rows.flatMap((row) => {
    if (!row.batchNo) {
      return [];
    }
    const balance = Number(row.balance ?? 0);
    if (balance <= 0) {
      return [];
    }
    return [{ balance, batchNo: row.batchNo }];
  });
}

interface BatchAllocation {
  availableQty: number;
  batchNo: string | null;
  itemId: string;
  qty: number;
  warehouseId: string;
}

async function allocateBatches(
  db: DB,
  allocation: BatchAllocation,
): Promise<Omit<SuggestedLine, "itemId">[]> {
  const { availableQty, batchNo, itemId, qty, warehouseId } = allocation;
  if (batchNo) {
    const balances = await batchBalances(db, itemId, warehouseId);
    const found = balances.find((entry) => entry.batchNo === batchNo);
    return [
      {
        availableQty: found?.balance ?? 0,
        batchNo,
        qty: Math.min(qty, found?.balance ?? 0),
        unallocatedQty: 0,
        warehouseId,
      },
    ];
  }
  const balances = await batchBalances(db, itemId, warehouseId);
  if (balances.length === 0) {
    return [{ availableQty, batchNo: null, qty, unallocatedQty: 0, warehouseId }];
  }
  const names = balances.map((entry) => entry.batchNo);
  const masters = await db
    .select()
    .from(inventoryBatch)
    .where(and(eq(inventoryBatch.item_id, itemId), inArray(inventoryBatch.batch_id, names)));
  const expiryByBatch = new Map(masters.map((master) => [master.batch_id, master.expiry_date]));
  const ordered = balances.toSorted((left, right) => {
    const leftExpiry = expiryByBatch.get(left.batchNo) ?? null;
    const rightExpiry = expiryByBatch.get(right.batchNo) ?? null;
    if (leftExpiry === rightExpiry) {
      return 0;
    }
    if (leftExpiry === null) {
      return 1;
    }
    if (rightExpiry === null) {
      return -1;
    }
    return leftExpiry < rightExpiry ? -1 : 1;
  });
  const lines: Omit<SuggestedLine, "itemId">[] = [];
  let remaining = qty;
  for (const entry of ordered) {
    if (remaining <= 0) {
      break;
    }
    const take = Math.min(remaining, entry.balance);
    lines.push({
      availableQty: entry.balance,
      batchNo: entry.batchNo,
      qty: take,
      unallocatedQty: 0,
      warehouseId,
    });
    remaining -= take;
  }
  if (remaining > 0) {
    lines.push({ availableQty, batchNo: null, qty: remaining, unallocatedQty: 0, warehouseId });
  }
  return lines;
}

export async function suggestPickLocations(
  db: DB,
  request: SuggestRequest,
): Promise<SuggestedLine[]> {
  let scope: Set<string> | null = null;
  if (request.parentWarehouseId) {
    const children = await db
      .select({ id: inventoryWarehouse.id })
      .from(inventoryWarehouse)
      .where(eq(inventoryWarehouse.parent_id, request.parentWarehouseId));
    scope = new Set([request.parentWarehouseId, ...children.map((child) => child.id)]);
  }

  const lines: SuggestedLine[] = [];
  // oxlint-disable eslint/no-await-in-loop
  for (const item of request.items) {
    const candidates = await oldestStockWarehouses(db, item.itemId);
    let remaining = item.qty;
    for (const candidate of candidates) {
      if (remaining <= 0) {
        break;
      }
      if (scope && !scope.has(candidate.warehouseId)) {
        continue;
      }
      const take = Math.min(remaining, candidate.onHand);
      const batchLines = await allocateBatches(db, {
        availableQty: candidate.onHand,
        batchNo: item.batchNo ?? null,
        itemId: item.itemId,
        qty: take,
        warehouseId: candidate.warehouseId,
      });
      let allocated = 0;
      for (const batchLine of batchLines) {
        lines.push({ ...batchLine, itemId: item.itemId });
        allocated += batchLine.qty;
      }
      remaining -= allocated;
    }
    if (remaining > 0) {
      lines.push({
        availableQty: 0,
        batchNo: item.batchNo ?? null,
        itemId: item.itemId,
        qty: 0,
        unallocatedQty: remaining,
        warehouseId: null,
      });
    }
  }
  // oxlint-enable eslint/no-await-in-loop
  return lines;
}
