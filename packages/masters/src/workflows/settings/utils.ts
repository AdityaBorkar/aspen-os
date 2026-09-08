import { masterSetting } from "#/db-schemas";
import { OrgBrandingSchema } from "#/schemas/setting";
import { SETTING_KEYS, SETTING_KEY_PREFIX } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import type { SQL } from "drizzle-orm";
import { eq, isNull } from "drizzle-orm";
import { safeParse, string } from "valibot";

/** Keys under the org. prefix are tenant-wide; every other key is per-user. */
export function isTenantSettingKey(key: string): boolean {
  return key.startsWith(SETTING_KEY_PREFIX.ORG);
}

/** Scope of a settings row: null user id means tenant-wide (org.* keys). */
export interface SettingScope {
  userId: string | null;
}

/** Resolve the settings scope from the key; per-user keys require an actor. */
export function resolveSettingScope(key: string, actorId: string | undefined): SettingScope {
  if (isTenantSettingKey(key)) {
    return { userId: null };
  }
  if (!actorId) {
    throw new Error("Authentication required");
  }
  return { userId: actorId };
}

/** WHERE fragment matching the settings row scope (null user_id = tenant-wide). */
export function settingScopeCondition(userId: string | null): SQL {
  return userId === null ? isNull(masterSetting.user_id) : eq(masterSetting.user_id, userId);
}

/** Well-known org.* settings get shape validation; every other key is stored as-is. */
export function validateSettingValue(key: string, value: JsonValue): JsonValue {
  if (key === SETTING_KEYS.ORG_ID || key === SETTING_KEYS.ORG_LOGO) {
    const parsed = safeParse(string(), value);
    if (!parsed.success) {
      throw new Error(`Setting "${key}" must be a string`);
    }
    return parsed.output;
  }
  if (key === SETTING_KEYS.ORG_BRANDING) {
    const parsed = safeParse(OrgBrandingSchema, value);
    if (!parsed.success) {
      throw new Error(`Setting "${key}" must be a branding object`);
    }
    return parsed.output;
  }
  return value;
}
