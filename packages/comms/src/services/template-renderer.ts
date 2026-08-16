import type { JsonValue } from "@aspen-os/platform/server";
import { safeParse, string } from "valibot";

const TEMPLATE_VAR_PATTERN = /\{[a-zA-Z0-9_.]+\}/g;

export function renderTemplate(template: string, params: Record<string, JsonValue>): string {
  return template.replace(TEMPLATE_VAR_PATTERN, (match) => {
    const key = match.slice(1, -1);
    const value = params[key];
    if (value === undefined || value === null) {
      return match;
    }
    const parsed = safeParse(string(), value);
    return parsed.success ? parsed.output : JSON.stringify(value);
  });
}
