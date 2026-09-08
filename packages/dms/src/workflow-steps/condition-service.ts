import { dmsFile } from "#/db-schemas";
import type { FileViewCondition, FileViewSort } from "#/types";
import { escapeLike } from "#/utils/escape-like";
import { toText } from "#/utils/to-text";

import type { JsonValue } from "@aspen-os/platform/server";
import {
  and,
  between as drizzleBetween,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  notIlike,
  notInArray,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { check, number, pipe, safeParse, string, transform, union } from "valibot";

export interface ConditionContext {
  classId?: string | null;
  ownerId?: string | null;
}

const COLUMN_SQL = {
  class: sql`${dmsFile.class_id}`,
  classId: sql`${dmsFile.class_id}`,
  contentType: sql`${dmsFile.content_type}`,
  createdAt: sql`${dmsFile.created_at}`,
  expiryDate: sql`${dmsFile.expiry_date}`,
  id: sql`${dmsFile.id}`,
  name: sql`${dmsFile.name}`,
  owner: sql`${dmsFile.owner_id}`,
  ownerId: sql`${dmsFile.owner_id}`,
  size: sql`${dmsFile.size}`,
  status: sql`${dmsFile.status}`,
  updatedAt: sql`${dmsFile.updated_at}`,
  uploadedBy: sql`${dmsFile.uploaded_by}`,
} satisfies Record<string, SQL>;

function columnSql(field: string): SQL | null {
  if (field in COLUMN_SQL) {
    // SAFETY: the `in` guard proves `field` is a known column key at runtime,
    // so the lookup yields a static SQL fragment.
    return COLUMN_SQL[field as keyof typeof COLUMN_SQL];
  }
  return null;
}

const NumericStringSchema = pipe(
  string(),
  check((val) => val.trim() !== ""),
  transform((val) => Number(val)),
  check((val) => Number.isFinite(val)),
);

const DateStringSchema = pipe(
  string(),
  check((val) => val.trim() !== ""),
  transform((val) => new Date(val)),
  check((val) => !Number.isNaN(val.getTime())),
);

function coerceNumber(value: JsonValue): number | null {
  const parsed = safeParse(union([number(), NumericStringSchema]), value);
  return parsed.success ? parsed.output : null;
}

function parseDate(value: JsonValue): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = safeParse(DateStringSchema, value);
  return parsed.success ? parsed.output.toISOString() : null;
}

function labelExistsSql(label: string, negated: boolean, joinLabel: boolean): SQL {
  if (joinLabel) {
    if (negated) {
      return sql`NOT EXISTS (
        SELECT 1 FROM dms_entity_label el
        JOIN dms_label lbl ON lbl.id = el.label_id
        WHERE el.entity_id = ${dmsFile.id}
          AND el.entity_type = 'file'
          AND lbl.name = ${label}
      )`;
    }
    return sql`EXISTS (
        SELECT 1 FROM dms_entity_label el
        JOIN dms_label lbl ON lbl.id = el.label_id
        WHERE el.entity_id = ${dmsFile.id}
          AND el.entity_type = 'file'
          AND lbl.name = ${label}
      )`;
  }
  if (negated) {
    return sql`NOT EXISTS (
        SELECT 1 FROM dms_entity_label el
        WHERE el.entity_id = ${dmsFile.id} AND el.entity_type = 'file'
      )`;
  }
  return sql`EXISTS (
        SELECT 1 FROM dms_entity_label el
        WHERE el.entity_id = ${dmsFile.id} AND el.entity_type = 'file'
      )`;
}

/**
 * Builds a drizzle SQL condition for a single view condition over file
 * columns, metadata keys, and label conditions.
 */
export function buildCondition(cond: FileViewCondition): SQL | null {
  const { field, operator, value } = cond;

  if (field === "label" || field === "labels") {
    const parsedLabel = safeParse(string(), value);
    const label = parsedLabel.success ? parsedLabel.output : "";
    if (!label) {
      return null;
    }
    if (operator === "eq" || operator === "contains") {
      return labelExistsSql(label, false, true);
    }
    if (operator === "notContains") {
      return labelExistsSql(label, true, true);
    }
    if (operator === "isEmpty") {
      return labelExistsSql(label, true, false);
    }
    if (operator === "isNotEmpty") {
      return labelExistsSql(label, false, false);
    }
    return null;
  }

  if (field === "metadata" || field.startsWith("metadata.")) {
    const key = field === "metadata" ? "" : field.slice("metadata.".length);
    if (!key) {
      return null;
    }
    const path = sql`${dmsFile.metadata}->>${key}`;
    return buildGenericCondition({ col: path, operator, type: "string", value });
  }

  if (field.startsWith("classField:")) {
    throw new Error(
      `Unsupported condition field "${field}": class field conditions are not filterable.`,
    );
  }

  const col = columnSql(field);
  if (!col) {
    return null;
  }

  let type: "date" | "number" | "string" = "string";
  if (field === "createdAt" || field === "updatedAt" || field === "expiryDate") {
    type = "date";
  } else if (field === "size" || field === "version") {
    type = "number";
  }

  return buildGenericCondition({ col, operator, type, value });
}

const NUMBER_OPS = { gt, gte, lt, lte } as const;

function buildGenericCondition(input: {
  col: SQL;
  operator: string;
  type: "date" | "number" | "string";
  value: JsonValue;
}): SQL | null {
  const { col, operator, type, value } = input;
  switch (operator) {
    case "eq": {
      if (value === null) {
        return isNull(col);
      }
      return eq(col, value);
    }
    case "neq": {
      if (value === null) {
        return isNotNull(col);
      }
      return ne(col, value);
    }
    case "contains": {
      if (type === "date" || type === "number") {
        return null;
      }
      return ilike(col, `%${escapeLike(toText(value))}%`);
    }
    case "notContains": {
      if (type === "date" || type === "number") {
        return null;
      }
      return notIlike(col, `%${escapeLike(toText(value))}%`);
    }
    case "in": {
      const values = Array.isArray(value) ? value : [value];
      return inArray(col, values);
    }
    case "notIn": {
      const values = Array.isArray(value) ? value : [value];
      return notInArray(col, values);
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const num = coerceNumber(value);
      if (num === null) {
        return null;
      }
      return NUMBER_OPS[operator](col, num);
    }
    case "between": {
      if (!Array.isArray(value) || value.length < 2) {
        return null;
      }
      const lower = coerceNumber(value[0]);
      const upper = coerceNumber(value[1]);
      if (lower === null || upper === null) {
        return null;
      }
      return drizzleBetween(col, lower, upper);
    }
    case "isEmpty": {
      return isNull(col);
    }
    case "isNotEmpty": {
      return isNotNull(col);
    }
    case "dateBefore":
    case "dateAfter": {
      const date = parseDate(value);
      if (!date) {
        return null;
      }
      return operator === "dateBefore" ? lte(col, date) : gte(col, date);
    }
    default: {
      return null;
    }
  }
}

/**
 * Builds the combined SQL where clause for an array of view conditions.
 * Unsupported conditions are silently skipped, except class field
 * conditions which throw (fail-closed).
 */
export function buildConditionsWhere(
  conditions: FileViewCondition[] | undefined,
  ctx?: ConditionContext,
): SQL | undefined {
  if ((!conditions || conditions.length === 0) && !ctx?.classId && !ctx?.ownerId) {
    return undefined;
  }

  const parts: SQL[] = [];
  for (const cond of conditions ?? []) {
    const built = buildCondition(cond);
    if (built) {
      parts.push(built);
    }
  }

  if (ctx?.classId) {
    parts.push(eq(dmsFile.class_id, ctx.classId));
  }
  if (ctx?.ownerId) {
    parts.push(eq(dmsFile.owner_id, ctx.ownerId));
  }

  return parts.length > 0 ? and(...parts) : undefined;
}

/**
 * Resolves a sort list into drizzle order-by expressions. Unsupported fields
 * are skipped; `resolve` maps a field name to a column.
 */
export function buildSortOrder(
  sort: FileViewSort[] | undefined,
  resolve: (field: string) => SQL | null,
): SQL[] {
  const clauses: SQL[] = [];
  for (const sortItem of sort ?? []) {
    const col = resolve(sortItem.field);
    if (!col) {
      continue;
    }
    clauses.push(sortItem.direction === "desc" ? desc(col) : col);
  }
  return clauses;
}
