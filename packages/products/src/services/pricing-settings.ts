import { productsPricelistSetting, productsSetting } from "#/db-schemas";
import type { ProductsPricelistSetting } from "#/db-schemas/pricelist-setting";
import type { ProductsSetting } from "#/db-schemas/setting";

import type { WorkflowContext } from "@aspen-os/platform/server";
import type { PgTable } from "drizzle-orm/pg-core";

type Db = WorkflowContext["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

/**
 * Singleton get-or-create shared by both settings tables. The insert uses
 * onConflictDoNothing so concurrent first-calls race safely: the loser falls
 * through to the re-select instead of throwing a duplicate-key error.
 */
async function getSingletonRow<TRow>(db: DbOrTx, table: PgTable, label: string): Promise<TRow> {
  // SAFETY: callers pass a concrete settings table and pin TRow to its $inferSelect.
  const [row] = (await db.select().from(table).limit(1)) as TRow[];
  if (row !== undefined) {
    return row;
  }
  // SAFETY: singleton settings tables accept an empty insert (every column has a default).
  const [created] = (await db.insert(table).values({}).onConflictDoNothing().returning()) as TRow[];
  if (created !== undefined) {
    return created;
  }
  // SAFETY: same narrow select as above; a row exists here unless the insert raced and lost.
  const [reselected] = (await db.select().from(table).limit(1)) as TRow[];
  if (reselected === undefined) {
    throw new Error(`Failed to initialize ${label}.`);
  }
  return reselected;
}

export async function getPricelistSettings(db: DbOrTx): Promise<ProductsPricelistSetting> {
  return getSingletonRow<ProductsPricelistSetting>(
    db,
    productsPricelistSetting,
    "pricelist settings",
  );
}

export async function getProductsSettings(db: DbOrTx): Promise<ProductsSetting> {
  return getSingletonRow<ProductsSetting>(db, productsSetting, "products settings");
}
