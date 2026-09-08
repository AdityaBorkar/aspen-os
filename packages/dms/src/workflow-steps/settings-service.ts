import { dmsSetting } from "#/db-schemas";
import { getDmsConfig } from "#/runtime";
import type { DmsRuntimeConfig } from "#/runtime";
import { CompressionOptionSchema } from "#/schemas";
import type { CompressionOption } from "#/types";
import { SETTING_KEYS } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { boolean, number, safeParse } from "valibot";
import type { GenericSchema, InferOutput } from "valibot";

type DB = PostgresJsDatabase;

export interface DmsSettingsValues {
  autoPurgeEveryHours: number;
  defaultCompression: CompressionOption;
  defaultRetentionDays: number;
  logDownloads: boolean;
  presignedUrlDefaultExpiry: number;
  presignedUrlMaxExpiry: number;
}

export function isCompressionOption(value: JsonValue): value is CompressionOption {
  return safeParse(CompressionOptionSchema, value).success;
}

interface SettingDef<TSchema extends GenericSchema> {
  fallback: (config: DmsRuntimeConfig) => InferOutput<TSchema>;
  key: string;
  schema: TSchema;
}

function coerce<TSchema extends GenericSchema>(
  schema: TSchema,
  value: JsonValue,
  fallback: InferOutput<TSchema>,
): InferOutput<TSchema> {
  const parsed = safeParse(schema, value);
  return parsed.success ? parsed.output : fallback;
}

const SETTING_DEFS = {
  autoPurgeEveryHours: {
    fallback: (config: DmsRuntimeConfig) => config.defaultAutoPurgeEveryHours,
    key: SETTING_KEYS.AUTO_PURGE_EVERY_HOURS,
    schema: number(),
  },
  defaultCompression: {
    fallback: (config: DmsRuntimeConfig) => config.defaultCompression,
    key: SETTING_KEYS.DEFAULT_COMPRESSION,
    schema: CompressionOptionSchema,
  },
  defaultRetentionDays: {
    fallback: (config: DmsRuntimeConfig) => config.defaultRetentionDays,
    key: SETTING_KEYS.DEFAULT_RETENTION_DAYS,
    schema: number(),
  },
  logDownloads: {
    fallback: () => false,
    key: SETTING_KEYS.LOG_DOWNLOADS,
    schema: boolean(),
  },
  presignedUrlDefaultExpiry: {
    fallback: (config: DmsRuntimeConfig) => config.defaultDownloadLinkExpiry,
    key: SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY,
    schema: number(),
  },
  presignedUrlMaxExpiry: {
    fallback: (config: DmsRuntimeConfig) => config.maxDownloadLinkExpiry,
    key: SETTING_KEYS.PRESIGNED_URL_MAX_EXPIRY,
    schema: number(),
  },
};

function readDef<TSchema extends GenericSchema>(
  def: SettingDef<TSchema>,
  stored: Map<string, JsonValue>,
  config: DmsRuntimeConfig,
): InferOutput<TSchema> {
  const fallback = def.fallback(config);
  const raw = stored.get(def.key) ?? fallback;
  // SAFETY: fallbacks are static config defaults or previously validated schema
  // outputs, so both branches are JSON-compatible setting values.
  return coerce(def.schema, raw as JsonValue, fallback);
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
  const [existingRow] = await db
    .select({ id: dmsSetting.id })
    .from(dmsSetting)
    .where(eq(dmsSetting.key, key))
    .limit(1);

  await (existingRow
    ? db
        .update(dmsSetting)
        .set({ updated_at: new Date(), value })
        .where(eq(dmsSetting.id, existingRow.id))
    : db.insert(dmsSetting).values({ key, value }));
}

export async function getDefaultSetting(key: string): Promise<JsonValue | null> {
  const def = Object.values(SETTING_DEFS).find((entry) => entry.key === key);
  if (!def) {
    return null;
  }
  return def.fallback(getDmsConfig());
}

export async function getSettingValues(db: DB): Promise<DmsSettingsValues> {
  const config = getDmsConfig();
  const keys = Object.values(SETTING_DEFS).map((def) => def.key);
  const rows = await db
    .select({ key: dmsSetting.key, value: dmsSetting.value })
    .from(dmsSetting)
    .where(inArray(dmsSetting.key, keys));
  const stored = new Map<string, JsonValue>(rows.map((row) => [row.key, row.value]));

  return {
    autoPurgeEveryHours: readDef(SETTING_DEFS.autoPurgeEveryHours, stored, config),
    defaultCompression: readDef(SETTING_DEFS.defaultCompression, stored, config),
    defaultRetentionDays: readDef(SETTING_DEFS.defaultRetentionDays, stored, config),
    logDownloads: readDef(SETTING_DEFS.logDownloads, stored, config),
    presignedUrlDefaultExpiry: readDef(SETTING_DEFS.presignedUrlDefaultExpiry, stored, config),
    presignedUrlMaxExpiry: readDef(SETTING_DEFS.presignedUrlMaxExpiry, stored, config),
  };
}
