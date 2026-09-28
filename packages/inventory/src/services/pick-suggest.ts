import { inventoryBatch } from "#/db-schemas/batch";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { inventoryWarehouse } from "#/db-schemas/warehouse";
import { asDb, getBatchBalances, getStockStates } from "#/services/stock-service";
import type { DbOrTx } from "#/services/stock-service";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

export interface SuggestRequestItem {
  batchNo?: string | null;
  itemId: string;
  qty: number;
}

export interface SuggestRequest {
  items: SuggestRequestItem[];
  parentWarehouseId?: string | null;
}

export type SuggestedLine =
  | {
      availableQty: number;
      batchNo: string | null;
      itemId: string;
      qty: number;
      warehouseId: string;
    }
  | {
      availableQty: number;
      batchNo: string | null;
      itemId: string;
      qty: 0;
      unallocatedQty: number;
      warehouseId: null;
    };

interface WarehouseCandidate {
  available: number;
  firstReceipt: string;
  onHand: number;
  warehouseId: string;
}

async function availableWarehouses(db: DbOrTx, itemId: string): Promise<WarehouseCandidate[]> {
  const handle = asDb(db);
  const rows = await handle
    .select({
      firstReceipt: sql<string>`min(${inventoryStockLedger.posting_date})`,
      onHand: sql<string>`sum(${inventoryStockLedger.qty_delta})`,
      warehouseId: inventoryStockLedger.warehouse_id,
    })
    .from(inventoryStockLedger)
    .where(eq(inventoryStockLedger.item_id, itemId))
    .groupBy(inventoryStockLedger.warehouse_id)
    .orderBy(
      sql`min(${inventoryStockLedger.posting_date}), min(${inventoryStockLedger.created_at})`,
    );
  const pairs = rows.map((row) => ({ itemId, warehouseId: row.warehouseId }));
  const states = await getStockStates(handle, pairs);
  const candidates: WarehouseCandidate[] = [];
  for (const row of rows) {
    const state = states.get(`${itemId}::${row.warehouseId}`);
    const available = state?.available ?? 0;
    const onHand = state?.onHand ?? Number(row.onHand ?? 0);
    if (available <= 0) {
      continue;
    }
    candidates.push({
      available,
      firstReceipt: row.firstReceipt,
      onHand,
      warehouseId: row.warehouseId,
    });
  }
  return candidates;
}

async function expiryByBatch(
  db: DbOrTx,
  itemId: string,
  batchNos: string[],
): Promise<Map<string, string | null>> {
  const handle = asDb(db);
  if (batchNos.length === 0) {
    return new Map();
  }
  const masters = await handle
    .select()
    .from(inventoryBatch)
    .where(and(eq(inventoryBatch.item_id, itemId), inArray(inventoryBatch.batch_id, batchNos)));
  return new Map(masters.map((master) => [master.batch_id, master.expiry_date]));
}

function orderByExpiry(
  balances: { balance: number; batchNo: string }[],
  expiries: Map<string, string | null>,
): { balance: number; batchNo: string }[] {
  return balances.toSorted((left, right) => {
    const leftExpiry = expiries.get(left.batchNo) ?? null;
    const rightExpiry = expiries.get(right.batchNo) ?? null;
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
}

async function allocateBatches(
  db: DbOrTx,
  itemId: string,
  warehouseId: string,
  qty: number,
  availableQty: number,
  batchNo: string | null,
): Promise<Omit<Extract<SuggestedLine, { warehouseId: string }>, "itemId">[]> {
  const handle = asDb(db);
  if (batchNo) {
    const balances = await getBatchBalances(handle, itemId, warehouseId, [batchNo]);
    const balance = balances.get(batchNo) ?? 0;
    const take = Math.min(qty, Math.max(balance, 0));
    return [{ availableQty: balance, batchNo, qty: take, warehouseId }];
  }
  const balances = await getBatchBalances(handle, itemId, warehouseId);
  const entries = [...balances]
    .filter(([, balance]) => balance > 0)
    .map(([name, balance]) => ({ balance, batchNo: name }));
  if (entries.length === 0) {
    return [{ availableQty, batchNo: null, qty, warehouseId }];
  }
  const expiries = await expiryByBatch(
    handle,
    itemId,
    entries.map((entry) => entry.batchNo),
  );
  const ordered = orderByExpiry(entries, expiries);
  const lines: Omit<Extract<SuggestedLine, { warehouseId: string }>, "itemId">[] = [];
  let remaining = qty;
  for (const entry of ordered) {
    if (remaining <= 0) {
      break;
    }
    const take = Math.min(remaining, entry.balance);
    lines.push({ availableQty: entry.balance, batchNo: entry.batchNo, qty: take, warehouseId });
    remaining -= take;
  }
  return lines;
}

async function suggestForItem(
  db: DbOrTx,
  item: SuggestRequestItem,
  scope: Set<string> | null,
): Promise<SuggestedLine[]> {
  const handle = asDb(db);
  const candidates = await availableWarehouses(handle, item.itemId);
  const lines: SuggestedLine[] = [];
  let remaining = item.qty;
  for (const candidate of candidates) {
    if (remaining <= 0) {
      break;
    }
    if (scope && !scope.has(candidate.warehouseId)) {
      continue;
    }
    const take = Math.min(remaining, candidate.available);
    const batchLines = await allocateBatches(
      handle,
      item.itemId,
      candidate.warehouseId,
      take,
      candidate.available,
      item.batchNo ?? null,
    );
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
  return lines;
}

export async function suggestPickLocations(
  db: DbOrTx,
  request: SuggestRequest,
): Promise<SuggestedLine[]> {
  const handle = asDb(db);
  let scope: Set<string> | null = null;
  if (request.parentWarehouseId) {
    const children = await handle
      .select({ id: inventoryWarehouse.id })
      .from(inventoryWarehouse)
      .where(eq(inventoryWarehouse.parent_id, request.parentWarehouseId));
    scope = new Set([request.parentWarehouseId, ...children.map((child) => child.id)]);
  }

  const perItem = await Promise.all(
    request.items.map((item) => suggestForItem(handle, item, scope)),
  );
  return perItem.flat();
}

export async function latestWarehouseByItem(db: DbOrTx, itemId: string): Promise<string | null> {
  const handle = asDb(db);
  const [row] = await handle
    .select({ warehouseId: inventoryStockLedger.warehouse_id })
    .from(inventoryStockLedger)
    .where(eq(inventoryStockLedger.item_id, itemId))
    .orderBy(desc(inventoryStockLedger.posting_date), desc(inventoryStockLedger.created_at))
    .limit(1);
  return row?.warehouseId ?? null;
}
