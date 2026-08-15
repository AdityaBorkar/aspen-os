import type { JsonValue } from "@aspen-os/platform/server";

export function stripUndefined<TValue extends Record<string, JsonValue>>(
  obj: TValue,
): Partial<TValue> {
  const result: Partial<TValue> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      Object.assign(result, { [key]: obj[key] });
    }
  }
  return result;
}
