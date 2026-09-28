import { productsItem, productsItemPrice } from "#/db-schemas";
import type { ProductsItemPrice } from "#/db-schemas/item-price";
import { validateItemPriceValues } from "#/services/pricing-validation";
import type { ItemPriceDraft } from "#/services/pricing-validation";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";

type Db = WorkflowContext["db"];

/**
 * Shared validate-then-insert for item prices. create, assign-to-parties, and
 * price-fetch auto-insert all funnel through here so the overlap check,
 * UOM/capability validation, and row shape cannot diverge.
 */
export async function insertItemPriceRow(
  db: Db,
  draft: ItemPriceDraft,
): Promise<ProductsItemPrice> {
  const values = await validateItemPriceValues(db, draft);
  const [row] = await db.insert(productsItemPrice).values(values).returning();
  if (!row) {
    throw new Error("Failed to create item price.");
  }
  return row;
}

/** Bump fetch telemetry after a price row wins a lookup. */
export async function touchFetchedRow(db: Db, id: string): Promise<ProductsItemPrice> {
  const [touched] = await db
    .update(productsItemPrice)
    .set({
      fetch_count: sql`${productsItemPrice.fetch_count} + 1`,
      last_fetched_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(productsItemPrice.id, id))
    .returning();
  if (!touched) {
    throw new Error(`Item price with id "${id}" not found.`);
  }
  return touched;
}

export async function markItemTransacted(db: Db, itemId: string): Promise<void> {
  await db
    .update(productsItem)
    .set({ has_transactions: true, updated_at: new Date() })
    .where(eq(productsItem.id, itemId));
}

export async function updateLastPurchaseRate(db: Db, itemId: string, rate: number): Promise<void> {
  await db
    .update(productsItem)
    .set({ last_purchase_rate: rate, updated_at: new Date() })
    .where(eq(productsItem.id, itemId));
}
