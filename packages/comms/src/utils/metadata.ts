import { JsonValueSchema } from "#/schemas/json";

import type { JsonValue } from "@aspen-os/platform/server";
import { record, safeParse, string } from "valibot";

function isRecord(value: JsonValue | null | undefined): value is Record<string, JsonValue> {
  if (Array.isArray(value)) {
    return false;
  }
  return safeParse(record(string(), JsonValueSchema), value).success;
}

function sortKeys(value: JsonValue | null | undefined): JsonValue | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeys(entry));
  }
  if (!isRecord(value)) {
    return value;
  }
  const sorted: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).toSorted()) {
    const entry = value[key];
    if (entry !== undefined) {
      sorted[key] = sortKeys(entry);
    }
  }
  return sorted;
}

/**
 * Key-order-insensitive metadata comparison. JSON key order is not
 * significant, so a naive `JSON.stringify` diff would flag a no-op reorder
 * as a change (extra write + spurious audit event).
 */
export function metadataEqual(
  left: Record<string, JsonValue> | null | undefined,
  right: Record<string, JsonValue> | null | undefined,
): boolean {
  return JSON.stringify(sortKeys(left)) === JSON.stringify(sortKeys(right));
}
