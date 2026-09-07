import type { JsonValue } from "@aspen-os/platform/server";

export function stripUndefined<TValue extends Record<string, JsonValue>>(
  obj: TValue,
): Partial<TValue> {
  const result: Partial<TValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      // SAFETY: key comes from Object.entries of obj, so writing it back with
      // its own value preserves the original per-key type.
      result[key as keyof TValue] = value as TValue[keyof TValue];
    }
  }
  return result;
}
