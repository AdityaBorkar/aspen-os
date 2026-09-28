import type { JsonValue } from "@aspen-os/platform/server";

export function snakeToCamel(value: string): string {
  const [head, ...tail] = value.split("_");
  if (head === undefined) {
    return value;
  }
  const rest = tail
    .map((part) => (part.length === 0 ? "" : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`))
    .join("");
  return `${head}${rest}`;
}

/**
 * Map top-level snake_case DB keys back to camelCase for event payloads.
 * Values pass through untouched; only keys are converted, one level deep.
 */
export function toCamelKeys(record: Record<string, JsonValue>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [snakeToCamel(key), value]),
  );
}
