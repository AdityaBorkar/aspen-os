import type { JsonValue } from "@aspen-os/platform/server";

export function stripUndefined<TValue extends Record<string, JsonValue>>(
  obj: TValue,
): Partial<TValue> {
  const result: Partial<TValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      Object.assign(result, { [key]: value });
    }
  }
  return result;
}
