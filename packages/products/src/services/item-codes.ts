import { productsBarcode, productsItem } from "#/db-schemas";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

type Db = WorkflowContext["db"];

interface UniqueCheck {
  column: PgColumn;
  excludeId?: string;
  label: string;
  table: PgTable & { id: PgColumn };
  value: string;
}

async function assertUnique(db: Db, check: UniqueCheck): Promise<void> {
  const [existing] = await db
    .select({ id: check.table.id })
    .from(check.table)
    .where(
      and(
        eq(check.column, check.value),
        check.excludeId ? ne(check.table.id, check.excludeId) : undefined,
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error(`${check.label} "${check.value}" already exists.`);
  }
}

export async function assertItemCodeUnique(
  db: Db,
  itemCode: string,
  excludeId?: string,
): Promise<void> {
  await assertUnique(db, {
    column: productsItem.item_code,
    excludeId,
    label: "Item code",
    table: productsItem,
    value: itemCode,
  });
}

export async function assertBarcodeUnique(
  db: Db,
  barcode: string,
  excludeId?: string,
): Promise<void> {
  await assertUnique(db, {
    column: productsBarcode.barcode,
    excludeId,
    label: "Barcode",
    table: productsBarcode,
    value: barcode,
  });
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
