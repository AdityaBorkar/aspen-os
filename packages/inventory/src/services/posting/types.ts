import { inventoryAdditionalCost } from "#/db-schemas/additional-cost";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
import { validateWarehouses } from "#/services/stock-math";
import { assertFreezeAllowed, getEffectiveSetting } from "#/services/stock-service";
import type { DbOrTx, EffectiveSetting } from "#/services/stock-service";

import { eq } from "drizzle-orm";

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

export async function prepareSubmit(
  db: DbOrTx,
  entryId: string,
  actorRole: string | null,
): Promise<PreparedSubmit> {
  const entry = await requireDraftEntry(db, entryId);
  const [items, costs, setting] = await Promise.all([
    db
      .select()
      .from(inventoryStockEntryItem)
      .where(eq(inventoryStockEntryItem.stock_entry_id, entryId)),
    db
      .select()
      .from(inventoryAdditionalCost)
      .where(eq(inventoryAdditionalCost.stock_entry_id, entryId)),
    getEffectiveSetting(db),
  ]);
  if (items.length === 0) {
    throw new Error("Cannot submit a stock entry without items.");
  }
  assertFreezeAllowed(setting, entry.posting_date, actorRole);
  validateWarehouses(entry.purpose, entry.source_warehouse_id, entry.target_warehouse_id, "header");
  return { costs, entry, items, setting };
}
