import { inventoryBatch } from "#/db-schemas/batch";
import { inventorySerial } from "#/db-schemas/serial";
import { toDateOnly } from "#/services/stock-math";
import { getBatchBalances } from "#/services/stock-service";
import type { DbOrTx } from "#/services/stock-service";

import { and, eq, inArray } from "drizzle-orm";

export interface BatchIssueCheck {
  batchNo: string;
  itemId: string;
  postingDateOnly: string;
  qty: number;
  warehouseId: string;
}

export async function assertBatchIssuable(db: DbOrTx, check: BatchIssueCheck): Promise<void> {
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
  const balances = await getBatchBalances(db, itemId, warehouseId, [batchNo]);
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
  const { batchNo, itemId, warehouseId } = query;
  const balances = await getBatchBalances(db, itemId, warehouseId, [batchNo]);
  return balances.get(batchNo) ?? 0;
}

export interface SerialIssueGroup {
  itemId: string;
  serialNos: string[];
  warehouseId: string;
}

export interface SerialAvailabilityCheck {
  items: SerialIssueGroup[];
}

export async function assertSerialsAvailable(
  db: DbOrTx,
  check: SerialAvailabilityCheck,
): Promise<void> {
  if (check.items.length === 0) {
    return;
  }
  const allSerials = [...new Set(check.items.flatMap((group) => group.serialNos))];
  if (allSerials.length === 0) {
    return;
  }
  const rows = await db
    .select()
    .from(inventorySerial)
    .where(inArray(inventorySerial.serial_no, allSerials));
  const byNo = new Map(rows.map((row) => [row.serial_no, row]));
  for (const group of check.items) {
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

export function postingDateOf(postingDate: string): string {
  return toDateOnly(postingDate);
}
