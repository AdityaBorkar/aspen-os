import { dmsFile } from "#/db-schemas";
import type { FileViewCondition, FileViewSort } from "#/types";
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
  notInArray,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { check, number, pipe, safeParse, string, transform, union } from "valibot";

export interface ConditionContext {
  classId?: string | null;
  ownerId?: string | null;
}

function columnSql(field: string): SQL | null {
  switch (field) {
    case "class":
    case "classId": {
      return sql`${dmsFile.classId}`;
    }
    case "contentType": {
      return sql`${dmsFile.contentType}`;
    }
    case "createdAt": {
      return sql`${dmsFile.createdAt}`;
    }
    case "expiryDate": {
      return sql`${dmsFile.expiryDate}`;
    }
    case "id": {
      return sql`${dmsFile.id}`;
    }
    case "name": {
      return sql`${dmsFile.name}`;
    }
    case "owner":
    case "ownerId": {
      return sql`${dmsFile.ownerId}`;
    }
    case "size": {
      return sql`${dmsFile.size}`;
    }
    case "status": {
      return sql`${dmsFile.status}`;
    }
    case "updatedAt": {
      return sql`${dmsFile.updatedAt}`;
    }
    case "uploadedBy": {
      return sql`${dmsFile.uploadedBy}`;
    }
    default: {
      return null;
    }
  }
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

function parseNumeric(value: JsonValue): number | null {
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

/**
 * Builds a drizzle SQL condition for a single view condition over file
 * columns, metadata keys, and label conditions.
 */
export function buildCondition(cond: FileViewCondition, _ctx?: ConditionContext): SQL | null {
  const { field, operator, value } = cond;

  if (field === "label" || field === "labels") {
    const parsedLabel = safeParse(string(), value);
    const label = parsedLabel.success ? parsedLabel.output : "";
    if (!label) {
      return null;
    }
    if (operator === "eq" || operator === "contains") {
      return sql`EXISTS (
        SELECT 1 FROM dms_entity_label el
        JOIN dms_label lbl ON lbl.id = el.label_id
        WHERE el.entity_id = ${dmsFile.id}
          AND el.entity_type = 'file'
          AND lbl.name = ${label}
      )`;
    }
    if (operator === "notContains") {
      return sql`NOT EXISTS (
        SELECT 1 FROM dms_entity_label el
        JOIN dms_label lbl ON lbl.id = el.label_id
        WHERE el.entity_id = ${dmsFile.id}
          AND el.entity_type = 'file'
          AND lbl.name = ${label}
      )`;
    }
    if (operator === "isEmpty") {
      return sql`NOT EXISTS (
        SELECT 1 FROM dms_entity_label el
        WHERE el.entity_id = ${dmsFile.id} AND el.entity_type = 'file'
      )`;
    }
    if (operator === "isNotEmpty") {
      return sql`EXISTS (
        SELECT 1 FROM dms_entity_label el
        WHERE el.entity_id = ${dmsFile.id} AND el.entity_type = 'file'
      )`;
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
    return null;
  }

  const col = columnSql(field);
  if (!col) {
    return null;
  }

  const type =
    field === "createdAt" || field === "updatedAt" || field === "expiryDate"
      ? "date"
      : field === "size" || field === "version"
        ? "number"
        : "string";

  return buildGenericCondition({ col, operator, type, value });
}

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
      return ilike(col, `%${toText(value)}%`);
    }
    case "notContains": {
      if (type === "date" || type === "number") {
        return null;
      }
      return sql`NOT (${ilike(col, `%${toText(value)}%`)})`;
    }
    case "in": {
      const values = Array.isArray(value) ? value : [value];
      return inArray(col, values);
    }
    case "notIn": {
      const values = Array.isArray(value) ? value : [value];
      return notInArray(col, values);
    }
    case "gt": {
      const num = parseNumeric(value);
      if (num === null) {
        return null;
      }
      return gt(col, num);
    }
    case "gte": {
      const num = parseNumeric(value);
      if (num === null) {
        return null;
      }
      return gte(col, num);
    }
    case "lt": {
      const num = parseNumeric(value);
      if (num === null) {
        return null;
      }
      return lt(col, num);
    }
    case "lte": {
      const num = parseNumeric(value);
      if (num === null) {
        return null;
      }
      return lte(col, num);
    }
    case "between": {
      if (!Array.isArray(value) || value.length < 2) {
        return null;
      }
      const lower = parseNumeric(value[0]);
      const upper = parseNumeric(value[1]);
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
    case "dateBefore": {
      const date = parseDate(value);
      if (!date) {
        return null;
      }
      return lte(col, date);
    }
    case "dateAfter": {
      const date = parseDate(value);
      if (!date) {
        return null;
      }
      return gte(col, date);
    }
    default: {
      return null;
    }
  }
}

/**
 * Builds the combined SQL where clause for an array of view conditions.
 * Unsupported conditions are silently skipped.
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
    const built = buildCondition(cond, ctx);
    if (built) {
      parts.push(built);
    }
  }

  if (ctx?.classId) {
    parts.push(eq(dmsFile.classId, ctx.classId));
  }
  if (ctx?.ownerId) {
    parts.push(eq(dmsFile.ownerId, ctx.ownerId));
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
