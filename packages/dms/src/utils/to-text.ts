import type { JsonValue } from "@aspen-os/platform/server";

export function toText(value: JsonValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (value instanceof Object) {
    return JSON.stringify(value);
  }
  return String(value);
}
