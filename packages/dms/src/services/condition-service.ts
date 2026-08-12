import {
  and,
  desc,
  between as drizzleBetween,
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

import { dmsDocument } from "../db-schemas";
import type { ViewCondition, ViewSort } from "../types";

export interface ConditionContext {
  classId?: string | null;
  ownerId?: string | null;
}

function columnSql(field: string): SQL | null {
  switch (field) {
    case "class":
    case "classId":
      return dmsDocument.classId as unknown as SQL;
    case "contentType":
      return dmsDocument.contentType as unknown as SQL;
    case "createdAt":
      return dmsDocument.createdAt as unknown as SQL;
    case "expiryDate":
      return dmsDocument.expiryDate as unknown as SQL;
    case "id":
      return dmsDocument.id as unknown as SQL;
    case "name":
      return dmsDocument.name as unknown as SQL;
    case "owner":
    case "ownerId":
      return dmsDocument.ownerId as unknown as SQL;
    case "size":
      return dmsDocument.size as unknown as SQL;
    case "status":
      return dmsDocument.status as unknown as SQL;
    case "updatedAt":
      return dmsDocument.updatedAt as unknown as SQL;
    case "uploadedBy":
      return dmsDocument.uploadedBy as unknown as SQL;
    default:
      return null;
  }
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim() !== "") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/**
 * Builds a drizzle SQL condition for a single view condition over document
 * columns, metadata keys, and tag conditions.
 */
export function buildCondition(
  cond: ViewCondition,
  _ctx?: ConditionContext,
): SQL | null {
  const { field, operator, value } = cond;

  if (field === "tag" || field === "tags") {
    const tag = typeof value === "string" ? value : "";
    if ((operator === "eq" || operator === "contains") && tag) {
      return sql`(${dmsDocument.tags} ? ${tag})`;
    }
    if (operator === "notContains") {
      return sql`NOT (${dmsDocument.tags} ? ${tag})`;
    }
    if (operator === "isEmpty") {
      return sql`${dmsDocument.tags} = '[]'::jsonb`;
    }
    if (operator === "isNotEmpty") {
      return sql`${dmsDocument.tags} <> '[]'::jsonb`;
    }
    return null;
  }

  if (field === "metadata" || field.startsWith("metadata.")) {
    const key = field === "metadata" ? "" : field.slice("metadata.".length);
    if (!key) return null;
    const path = sql`${dmsDocument.metadata}->>${key}`;
    return buildGenericCondition(path, operator, value, "string");
  }

  if (field.startsWith("classField:")) {
    return null;
  }

  const col = columnSql(field);
  if (!col) return null;

  const type =
    field === "createdAt" || field === "updatedAt" || field === "expiryDate"
      ? "date"
      : field === "size" || field === "version"
        ? "number"
        : "string";

  return buildGenericCondition(col, operator, value, type);
}

function buildGenericCondition(
  col: SQL,
  operator: string,
  value: unknown,
  type: "date" | "number" | "string",
): SQL | null {
  switch (operator) {
    case "eq":
      if (value === null) return isNull(col);
      return eq(col, value as never);
    case "neq":
      if (value === null) return isNotNull(col);
      return ne(col, value as never);
    case "contains": {
      if (type === "date" || type === "number") return null;
      return ilike(col, `%${String(value)}%`);
    }
    case "notContains": {
      if (type === "date" || type === "number") return null;
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
      if (num === null) return null;
      return gt(col, num);
    }
    case "gte": {
      const num = parseNumeric(value);
      if (num === null) return null;
      return gte(col, num);
    }
    case "lt": {
      const num = parseNumeric(value);
      if (num === null) return null;
      return lt(col, num);
    }
    case "lte": {
      const num = parseNumeric(value);
      if (num === null) return null;
      return lte(col, num);
    }
    case "between": {
      if (!Array.isArray(value) || value.length < 2) return null;
      const a = parseNumeric(value[0]);
      const b = parseNumeric(value[1]);
      if (a === null || b === null) return null;
      return drizzleBetween(col, a, b);
    }
    case "isEmpty":
      return isNull(col);
    case "isNotEmpty":
      return isNotNull(col);
    case "dateBefore": {
      const d = parseDate(value);
      if (!d) return null;
      return lte(col, d);
    }
    case "dateAfter": {
      const d = parseDate(value);
      if (!d) return null;
      return gte(col, d);
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
  conditions: ViewCondition[] | undefined,
  ctx?: ConditionContext,
): SQL | undefined {
  if (
    (!conditions || conditions.length === 0) &&
    !ctx?.classId &&
    !ctx?.ownerId
  ) {
    return undefined;
  }

  const parts: SQL[] = [];
  for (const cond of conditions ?? []) {
    const built = buildCondition(cond, ctx);
    if (built) parts.push(built);
  }

  if (ctx?.classId)
    parts.push(eq(dmsDocument.classId, ctx.classId) as unknown as SQL);
  if (ctx?.ownerId)
    parts.push(eq(dmsDocument.ownerId, ctx.ownerId) as unknown as SQL);

  return parts.length > 0 ? and(...parts) : undefined;
}

/**
 * Resolves a sort list into drizzle order-by expressions. Unsupported fields
 * are skipped; `resolve` maps a field name to a column.
 */
export function buildSortOrder<T extends SQL>(
  sort: ViewSort[] | undefined,
  resolve: (field: string) => T | null,
): T[] {
  const clauses: T[] = [];
  for (const s of sort ?? []) {
    const col = resolve(s.field);
    if (!col) continue;
    clauses.push((s.direction === "desc" ? desc(col) : col) as unknown as T);
  }
  return clauses;
}
