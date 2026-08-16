import type { JsonValue } from "@aspen-os/platform/server";

export function stripUndefined<TValue extends Record<string, JsonValue>>(
  obj: TValue,
): Partial<TValue> {
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (value === undefined) {
      Reflect.deleteProperty(result, key);
    }
  }
  return result;
}
