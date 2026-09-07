import type { JsonValue } from "@aspen-os/platform/server";
import { boolean, number, safeParse, string } from "valibot";

const TEMPLATE_VAR_PATTERN = /\{[a-zA-Z0-9_.]+\}/g;

export interface RenderOptions {
  /** When true, missing variables throw instead of leaving `{var}` in output. */
  strict?: boolean;
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return false;
  }
  if (value instanceof Date) {
    return false;
  }
  return value instanceof Object;
}

function resolvePath(params: Record<string, JsonValue>, key: string): JsonValue | undefined {
  if (Object.hasOwn(params, key)) {
    return params[key];
  }
  let current: JsonValue = params;
  for (const part of key.split(".")) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[part];
    if (current === undefined) {
      return undefined;
    }
  }
  return current;
}

function stringifyParam(value: JsonValue): string {
  const asString = safeParse(string(), value);
  if (asString.success) {
    return asString.output;
  }
  const asNumber = safeParse(number(), value);
  if (asNumber.success) {
    return String(asNumber.output);
  }
  const asBoolean = safeParse(boolean(), value);
  if (asBoolean.success) {
    return String(asBoolean.output);
  }
  return JSON.stringify(value);
}

/**
 * Renders `{var}` / `{user.name}` placeholders. Dotted paths resolve into
 * nested objects. Missing variables leave the placeholder in place by
 * default; pass `{ strict: true }` for transactional sends where a missing
 * variable should fail loudly instead of shipping `{var}` to a user.
 */
export function renderTemplate(
  template: string,
  params: Record<string, JsonValue>,
  options?: RenderOptions,
): string {
  return template.replace(TEMPLATE_VAR_PATTERN, (match) => {
    const key = match.slice(1, -1);
    const value = resolvePath(params, key);
    if (value === undefined || value === null) {
      if (options?.strict) {
        throw new Error(`Template is missing variable "${key}".`);
      }
      return match;
    }
    return stringifyParam(value);
  });
}
