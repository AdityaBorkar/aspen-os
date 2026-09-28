import { inventorySerial } from "#/db-schemas/serial";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import type { DbOrTx } from "#/services/stock-service";

import { and, eq } from "drizzle-orm";

export interface VoucherReversal {
  cancelVoucherType: string;
  voucherId: string;
  voucherType: string;
}

export async function reverseVoucher(db: DbOrTx, reversal: VoucherReversal): Promise<string[]> {
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

  if (originals.length === 0) {
    return [];
  }
  const inserted = await db
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
  const serialed = originals.filter(
    (original): original is typeof original & { serial_no: string } => original.serial_no !== null,
  );
  for (const original of serialed) {
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

  return inserted.map((row) => row.id);
}

export async function reversePosting(db: DbOrTx, entryId: string): Promise<string[]> {
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
