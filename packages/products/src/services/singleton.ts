import type { productsPricelistSetting, productsSetting } from "#/db-schemas";
import type { ProductsPricelistSetting } from "#/db-schemas/pricelist-setting";
import type { ProductsSetting } from "#/db-schemas/setting";

import type { WorkflowContext } from "@aspen-os/platform/server";

type Db = WorkflowContext["db"];

type SingletonTable = typeof productsPricelistSetting | typeof productsSetting;

export function getOrCreateSingleton(
  db: Db,
  table: typeof productsSetting,
  label: string,
): Promise<ProductsSetting>;
export function getOrCreateSingleton(
  db: Db,
  table: typeof productsPricelistSetting,
  label: string,
): Promise<ProductsPricelistSetting>;
/**
 * Get-or-create for single-row settings tables. Select first; on a miss,
 * insert a defaults row with `onConflictDoNothing` (a concurrent creator wins
 * the race without error); when the insert loses the race, re-select the
 * winner instead of throwing.
 */
export async function getOrCreateSingleton(
  db: Db,
  table: SingletonTable,
  label: string,
): Promise<ProductsSetting | ProductsPricelistSetting> {
  const [existing] = await db.select().from(table).limit(1);
  if (existing) {
    return existing;
  }
  const [created] = await db.insert(table).values({}).onConflictDoNothing().returning();
  if (created) {
    return created;
  }
  const [raced] = await db.select().from(table).limit(1);
  if (!raced) {
    throw new Error(`Failed to initialize ${label}.`);
  }
  return raced;
}
