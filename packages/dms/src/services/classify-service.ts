import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { dmsClassField } from "../db-schemas";

export interface ClassFieldRow {
  defaultValue: unknown;
  isActive: boolean;
  isRequired: boolean;
  label: string;
  name: string;
  options: string[] | unknown;
  type: string;
}

export interface FieldValidationResult {
  errors: { message: string; name: string }[];
  missing: string[];
}

const FIELD_VALUE_EMPTY = new Set(["", null, undefined]);

export async function getActiveFields(
  db: NodePgDatabase,
  classId: string,
): Promise<ClassFieldRow[]> {
  const rows = await db.select().from(dmsClassField).where(eq(dmsClassField.classId, classId));
  return rows.filter((r) => r.isActive);
}

/**
 * Validates the provided field values against the class's active fields.
 * Required fields must be present and non-empty. Select/multi-select values
 * must be within the allowed options.
 */
export function validateFieldValues(
  fields: ClassFieldRow[],
  fieldValues: Record<string, unknown> | undefined,
): FieldValidationResult {
  const missing: string[] = [];
  const errors: { message: string; name: string }[] = [];
  const values = fieldValues ?? {};

  for (const field of fields) {
    let value: unknown = values[field.name];
    if (value === undefined && field.defaultValue !== null && field.defaultValue !== undefined) {
      value = field.defaultValue;
    }

    const isEmpty = value === undefined || FIELD_VALUE_EMPTY.has(value as never);

    if (field.isRequired && isEmpty) {
      missing.push(field.name);
      errors.push({
        message: `Field "${field.label}" is required.`,
        name: field.name,
      });
      continue;
    }

    if (isEmpty) {
      continue;
    }

    if (
      (field.type === "select" || field.type === "multi-select") &&
      field.options !== null &&
      field.options !== undefined
    ) {
      const optionList = Array.isArray(field.options)
        ? field.options
        : Object.keys(field.options as Record<string, unknown>);
      if (optionList.length > 0) {
        const allowed = new Set(optionList.map(String));
        const selected =
          field.type === "multi-select" && Array.isArray(value) ? (value as unknown[]) : [value];
        for (const item of selected) {
          if (item !== null && item !== undefined && !allowed.has(String(item))) {
            errors.push({
              message: `"${String(item)}" is not an allowed option for "${field.label}".`,
              name: field.name,
            });
          }
        }
      }
    }
  }

  return { errors, missing };
}

const PLACEHOLDER_REGEX = /\{([^}]+)\}/g;

function padZero(value: number | string, width: number): string {
  return String(value).padStart(width, "0");
}

function safePart(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return str.replace(/[\\/]+/g, "_").replace(/\0/g, "");
}

function formatDateToken(token: string, date: Date): string {
  const parts: Record<string, string> = {
    MM: padZero(date.getMonth() + 1, 2),
    dd: padZero(date.getDate(), 2),
    yyyy: String(date.getFullYear()),
  };
  return parts[token] ?? "";
}

/**
 * Renders a class file-naming schema from the class field values, the current
 * document name, class name, doc number, and date. Unresolved placeholders
 * resolve to a safe fallback (`_`) and the result strips path separators and
 * null bytes.
 *
 * Templates follow the form `{field:<name>}`, `{class}`, `{docNumber}`,
 * `{date}`, `{date:yyyy}`, `{date:MM}`, `{seq}`.
 */
export function renderFileNamingSchema(input: {
  className: string | null;
  date?: Date;
  docNumber: string;
  fieldValues?: Record<string, unknown> | null;
  originalName: string;
  schema: string | null;
  seq?: number;
}): string | null {
  if (!input.schema) {
    return null;
  }

  const date = input.date ?? new Date();

  const rendered = input.schema.replace(PLACEHOLDER_REGEX, (_raw, key: string) => {
    if (key.startsWith("field:")) {
      const fieldName = key.slice("field:".length);
      const value = input.fieldValues?.[fieldName];
      return value === undefined || value === null || value === "" ? "_" : safePart(value);
    }
    switch (key) {
      case "class":
        return safePart(input.className ?? "_");
      case "docNumber":
        return safePart(input.docNumber);
      case "date":
        return date.toISOString().slice(0, 10);
      case "seq":
        return padZero(input.seq ?? 0, 4);
      default:
        if (key.startsWith("date:")) {
          return formatDateToken(key.slice("date:".length), date);
        }
        return "_";
    }
  });

  const cleaned = rendered
    .replace(/[\\/]+/g, "_")
    .replace(/\0/g, "")
    .trim();
  return cleaned.length > 0 ? cleaned : input.originalName;
}
