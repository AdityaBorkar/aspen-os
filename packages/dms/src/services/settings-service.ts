import { dmsSetting } from "#/db-schemas";
import { getDmsConfig } from "#/runtime";
import type { CompressionOption } from "#/types";
import { SETTING_KEYS } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { boolean, number, object, safeParse, string } from "valibot";

type DB = NodePgDatabase;

export interface DmsSettingsValues {
  autoPurgeEveryHours: number;
  defaultCompression: { enabled: boolean; mode: string };
  defaultRetentionDays: number;
  logDownloads: boolean;
  presignedUrlDefaultExpiry: number;
  presignedUrlMaxExpiry: number;
}

const CompressionOptionGuard = object({
  enabled: boolean(),
  mode: string(),
});

export function isCompressionOption(value: JsonValue): value is CompressionOption {
  return safeParse(CompressionOptionGuard, value).success;
}

export async function getSetting(db: DB, key: string): Promise<JsonValue | null> {
  const [row] = await db
    .select({ value: dmsSetting.value })
    .from(dmsSetting)
    .where(eq(dmsSetting.key, key))
    .limit(1);

  return row?.value ?? null;
}

export async function setSetting(db: DB, key: string, value: JsonValue): Promise<void> {
  const existing = await db
    .select({ id: dmsSetting.id })
    .from(dmsSetting)
    .where(eq(dmsSetting.key, key))
    .limit(1);

  await (existing[0]
    ? db
        .update(dmsSetting)
        .set({ updatedAt: new Date(), value })
        .where(eq(dmsSetting.id, existing[0].id))
    : db.insert(dmsSetting).values({ key, value }));
}

const DEFAULT_VALUES = {
  [SETTING_KEYS.AUTO_PURGE_EVERY_HOURS]: 24,
  [SETTING_KEYS.DEFAULT_COMPRESSION]: { enabled: true, mode: "none" },
  [SETTING_KEYS.DEFAULT_RETENTION_DAYS]: 180,
  [SETTING_KEYS.LOG_DOWNLOADS]: false,
  [SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY]: 3600,
  [SETTING_KEYS.PRESIGNED_URL_MAX_EXPIRY]: 604_800,
} satisfies Record<string, JsonValue>;

export async function getDefaultSetting(key: string): Promise<JsonValue | null> {
  switch (key) {
    case SETTING_KEYS.AUTO_PURGE_EVERY_HOURS: {
      return getDmsConfig().defaultAutoPurgeEveryHours;
    }
    case SETTING_KEYS.DEFAULT_COMPRESSION: {
      return getDmsConfig().defaultCompression;
    }
    case SETTING_KEYS.DEFAULT_RETENTION_DAYS: {
      return getDmsConfig().defaultRetentionDays;
    }
    case SETTING_KEYS.LOG_DOWNLOADS: {
      return DEFAULT_VALUES[SETTING_KEYS.LOG_DOWNLOADS];
    }
    case SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY: {
      return DEFAULT_VALUES[SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY];
    }
    case SETTING_KEYS.PRESIGNED_URL_MAX_EXPIRY: {
      return DEFAULT_VALUES[SETTING_KEYS.PRESIGNED_URL_MAX_EXPIRY];
    }
    default: {
      return null;
    }
  }
}

export async function getSettingValues(db: DB): Promise<DmsSettingsValues> {
  const config = getDmsConfig();

  const raw = async (key: string, fallback: JsonValue): Promise<JsonValue> => {
    const value = await getSetting(db, key);
    return value ?? fallback;
  };

  const autoPurgeEveryHours = await raw(
    SETTING_KEYS.AUTO_PURGE_EVERY_HOURS,
    config.defaultAutoPurgeEveryHours,
  );
  const defaultCompression = await raw(SETTING_KEYS.DEFAULT_COMPRESSION, config.defaultCompression);
  const defaultRetentionDays = await raw(
    SETTING_KEYS.DEFAULT_RETENTION_DAYS,
    config.defaultRetentionDays,
  );
  const logDownloads = await raw(SETTING_KEYS.LOG_DOWNLOADS, false);
  const presignedUrlDefaultExpiry = await raw(
    SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY,
    config.defaultDownloadLinkExpiry,
  );
  const presignedUrlMaxExpiry = await raw(
    SETTING_KEYS.PRESIGNED_URL_MAX_EXPIRY,
    config.maxDownloadLinkExpiry,
  );

  return {
    autoPurgeEveryHours: asNumber(autoPurgeEveryHours, config.defaultAutoPurgeEveryHours),
    defaultCompression: isCompressionOption(defaultCompression)
      ? defaultCompression
      : config.defaultCompression,
    defaultRetentionDays: asNumber(defaultRetentionDays, config.defaultRetentionDays),
    logDownloads: asBoolean(logDownloads, false),
    presignedUrlDefaultExpiry: asNumber(
      presignedUrlDefaultExpiry,
      config.defaultDownloadLinkExpiry,
    ),
    presignedUrlMaxExpiry: asNumber(presignedUrlMaxExpiry, config.maxDownloadLinkExpiry),
  };
}

function asNumber(value: JsonValue, fallback: number): number {
  const parsed = safeParse(number(), value);
  return parsed.success ? parsed.output : fallback;
}

function asBoolean(value: JsonValue, fallback: boolean): boolean {
  const parsed = safeParse(boolean(), value);
  return parsed.success ? parsed.output : fallback;
}
