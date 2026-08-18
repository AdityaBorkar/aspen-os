import { commsSetting } from "#/db-schemas";
import { SETTING_KEYS } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DB = PostgresJsDatabase;

export async function getSetting(db: DB, key: string): Promise<JsonValue | null> {
  const [row] = await db
    .select({ value: commsSetting.value })
    .from(commsSetting)
    .where(eq(commsSetting.key, key))
    .limit(1);

  return row?.value ?? null;
}

export async function setSetting(db: DB, key: string, value: JsonValue): Promise<void> {
  const existing = await db
    .select({ id: commsSetting.id })
    .from(commsSetting)
    .where(eq(commsSetting.key, key))
    .limit(1);

  await (existing[0]
    ? db
        .update(commsSetting)
        .set({ updatedAt: new Date(), value })
        .where(eq(commsSetting.id, existing[0].id))
    : db.insert(commsSetting).values({ key, value }));
}

export const DEFAULT_SETTING_VALUES = {
  [SETTING_KEYS.DEFAULT_CHANNELS]: null,
  [SETTING_KEYS.HOST_DEFAULT_SENDER_ADDRESS_OVERRIDE]: null,
  [SETTING_KEYS.SUPPRESS_OUT_OF_BAND]: false,
} satisfies Record<string, JsonValue>;
