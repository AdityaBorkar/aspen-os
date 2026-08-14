import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { dmsSetting } from "../db-schemas";
import { getDmsConfig } from "../runtime";
import { SETTING_KEYS } from "../utils/constants";

type DB = NodePgDatabase<Record<string, never>>;

export interface DmsSettingsValues {
  autoPurgeEveryHours: number;
  defaultCompression: { enabled: boolean; mode: string };
  defaultRetentionDays: number;
  logDownloads: boolean;
  presignedUrlDefaultExpiry: number;
  presignedUrlMaxExpiry: number;
}

export async function getSetting(db: DB, key: string): Promise<unknown> {
  const [row] = await db
    .select({ value: dmsSetting.value })
    .from(dmsSetting)
    .where(eq(dmsSetting.key, key))
    .limit(1);

  return row?.value ?? null;
}

export async function setSetting(db: DB, key: string, value: unknown): Promise<void> {
  const existing = await db
    .select({ id: dmsSetting.id })
    .from(dmsSetting)
    .where(eq(dmsSetting.key, key))
    .limit(1);

  if (existing[0]) {
    await db
      .update(dmsSetting)
      .set({ updatedAt: new Date(), value })
      .where(eq(dmsSetting.id, existing[0].id));
  } else {
    await db.insert(dmsSetting).values({ key, value });
  }
}

const DEFAULT_VALUES: Record<string, unknown> = {
  [SETTING_KEYS.AUTO_PURGE_EVERY_HOURS]: 24,
  [SETTING_KEYS.DEFAULT_COMPRESSION]: { enabled: true, mode: "none" },
  [SETTING_KEYS.DEFAULT_RETENTION_DAYS]: 180,
  [SETTING_KEYS.LOG_DOWNLOADS]: false,
  [SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY]: 3600,
  [SETTING_KEYS.PRESIGNED_URL_MAX_EXPIRY]: 604800,
};

export async function getDefaultSetting(key: string): Promise<unknown> {
  const defaults: Record<string, unknown> = { ...DEFAULT_VALUES };

  if (key === SETTING_KEYS.AUTO_PURGE_EVERY_HOURS) {
    defaults[SETTING_KEYS.AUTO_PURGE_EVERY_HOURS] = getDmsConfig().defaultAutoPurgeEveryHours;
  } else if (key === SETTING_KEYS.DEFAULT_COMPRESSION) {
    defaults[SETTING_KEYS.DEFAULT_COMPRESSION] = getDmsConfig().defaultCompression;
  } else if (key === SETTING_KEYS.DEFAULT_RETENTION_DAYS) {
    defaults[SETTING_KEYS.DEFAULT_RETENTION_DAYS] = getDmsConfig().defaultRetentionDays;
  }

  return defaults[key] ?? null;
}

export async function getSettingValues(db: DB): Promise<DmsSettingsValues> {
  const config = getDmsConfig();
  const raw = async (key: string, fallback: unknown): Promise<unknown> => {
    const value = await getSetting(db, key);
    return value ?? fallback;
  };

  return {
    autoPurgeEveryHours: (await raw(
      SETTING_KEYS.AUTO_PURGE_EVERY_HOURS,
      config.defaultAutoPurgeEveryHours,
    )) as number,
    defaultCompression: (await raw(
      SETTING_KEYS.DEFAULT_COMPRESSION,
      config.defaultCompression,
    )) as { enabled: boolean; mode: string },
    defaultRetentionDays: (await raw(
      SETTING_KEYS.DEFAULT_RETENTION_DAYS,
      config.defaultRetentionDays,
    )) as number,
    logDownloads: ((await raw(SETTING_KEYS.LOG_DOWNLOADS, false)) as boolean) ?? false,
    presignedUrlDefaultExpiry: (await raw(
      SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY,
      config.defaultDownloadLinkExpiry,
    )) as number,
    presignedUrlMaxExpiry: (await raw(
      SETTING_KEYS.PRESIGNED_URL_MAX_EXPIRY,
      config.maxDownloadLinkExpiry,
    )) as number,
  };
}
