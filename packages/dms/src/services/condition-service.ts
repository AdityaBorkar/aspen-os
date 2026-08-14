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
  type SQL,
  sql,
} from "drizzle-orm";

import { dmsFile } from "../db-schemas";
import type { FileViewCondition, FileViewSort } from "../types";

export interface ConditionContext {
  classId?: string | null;
  ownerId?: string | null;
}

function columnSql(field: string): SQL | null {
  switch (field) {
    case "class":
    case "classId":
      return dmsFile.classId as unknown as SQL;
    case "contentType":
      return dmsFile.contentType as unknown as SQL;
    case "createdAt":
      return dmsFile.createdAt as unknown as SQL;
    case "expiryDate":
      return dmsFile.expiryDate as unknown as SQL;
    case "id":
      return dmsFile.id as unknown as SQL;
    case "name":
      return dmsFile.name as unknown as SQL;
    case "owner":
    case "ownerId":
      return dmsFile.ownerId as unknown as SQL;
    case "size":
      return dmsFile.size as unknown as SQL;
    case "status":
      return dmsFile.status as unknown as SQL;
    case "updatedAt":
      return dmsFile.updatedAt as unknown as SQL;
    case "uploadedBy":
      return dmsFile.uploadedBy as unknown as SQL;
    default:
      return null;
  }
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim() !== "") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

/**
 * Builds a drizzle SQL condition for a single view condition over file
 * columns, metadata keys, and label conditions.
 */
export function buildCondition(cond: FileViewCondition, _ctx?: ConditionContext): SQL | null {
  const { field, operator, value } = cond;

  if (field === "label" || field === "labels") {
    const label = typeof value === "string" ? value : "";
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
  value: unknown;
}): SQL | null {
  const { col, operator, type, value } = input;
  switch (operator) {
    case "eq":
      if (value === null) {
        return isNull(col);
      }
      return eq(col, value as never);
    case "neq":
      if (value === null) {
        return isNotNull(col);
      }
      return ne(col, value as never);
    case "contains": {
      if (type === "date" || type === "number") {
        return null;
      }
      return ilike(col, `%${String(value)}%`);
    }
    case "notContains": {
      if (type === "date" || type === "number") {
        return null;
      }
      return sql`NOT (${ilike(col, `%${String(value)}%`)})`;
    }
    case "in": {
      const values = Array.isArray(value) ? value : [value];
      return inArray(col, values as never[]);
    }
    case "notIn": {
      const values = Array.isArray(value) ? value : [value];
      return notInArray(col, values as never[]);
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
    case "isEmpty":
      return isNull(col);
    case "isNotEmpty":
      return isNotNull(col);
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
    default:
      return null;
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
    parts.push(eq(dmsFile.classId, ctx.classId) as unknown as SQL);
  }
  if (ctx?.ownerId) {
    parts.push(eq(dmsFile.ownerId, ctx.ownerId) as unknown as SQL);
  }

  return parts.length > 0 ? and(...parts) : undefined;
}

/**
 * Resolves a sort list into drizzle order-by expressions. Unsupported fields
 * are skipped; `resolve` maps a field name to a column.
 */
export function buildSortOrder<TSQL extends SQL>(
  sort: FileViewSort[] | undefined,
  resolve: (field: string) => TSQL | null,
): TSQL[] {
  const clauses: TSQL[] = [];
  for (const sortItem of sort ?? []) {
    const col = resolve(sortItem.field);
    if (!col) {
      continue;
    }
    clauses.push((sortItem.direction === "desc" ? desc(col) : col) as unknown as TSQL);
  }
  return clauses;
}
