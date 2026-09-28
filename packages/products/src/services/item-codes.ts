import { productsBarcode, productsItem } from "#/db-schemas";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";

type Db = WorkflowContext["db"];

export async function assertItemCodeUnique(
  db: Db,
  itemCode: string,
  excludeId?: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: productsItem.id })
    .from(productsItem)
    .where(
      and(
        eq(productsItem.item_code, itemCode),
        excludeId ? ne(productsItem.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error(`Item code "${itemCode}" already exists.`);
  }
}

export async function assertBarcodeUnique(
  db: Db,
  barcode: string,
  excludeId?: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: productsBarcode.id })
    .from(productsBarcode)
    .where(
      and(
        eq(productsBarcode.barcode, barcode),
        excludeId ? ne(productsBarcode.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error(`Barcode "${barcode}" already exists.`);
  }
}

function randomSeriesCode(prefix: string | null): string {
  const now = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase();
  const head = prefix && prefix.length > 0 ? prefix : "ITEM";
  return `${head}-${now}${random}`;
}

/**
 * Generate a naming-series code that is actually unique. The code embeds a
 * timestamp plus cryptographic randomness, but generation is still
 * check-then-insert, so retry against the unique index instead of trusting it.
 */
export async function generateUniqueItemCode(db: Db, prefix: string | null): Promise<string> {
  const attempts = 5;
  // oxlint-disable eslint/no-await-in-loop
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = randomSeriesCode(prefix);
    try {
      await assertItemCodeUnique(db, candidate);
      return candidate;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("already exists")) {
        throw error;
      }
      if (attempt === attempts - 1) {
        throw new Error("Failed to generate a unique item code after several attempts.", {
          cause: error,
        });
      }
    }
  }
  // oxlint-enable eslint/no-await-in-loop
  throw new Error("Failed to generate a unique item code after several attempts.");
}
