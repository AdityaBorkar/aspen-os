import { and, desc, eq, gte, ilike, lte, type SQL, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { dmsDocument, dmsDocumentClass, dmsTag } from "../db-schemas";
import type {
  DmsDocument,
  QuickSearchInput,
  SearchOptions,
  ViewCondition,
  ViewSort,
} from "../types";
import { buildSortOrder } from "./condition-service";

type DB = NodePgDatabase<Record<string, never>>;

export interface QuickSearchHit {
  document: DmsDocument;
  matched: {
    field: string;
    value: string;
  };
}

export interface QuickSearchResult {
  classes: string[];
  documents: QuickSearchHit[];
  tags: string[];
}

/**
 * Appends security-scoped visibility conditions for a caller: owner or grants
 * to the caller, plus org-wide access for admins (admin flag passed by the
 * caller). Triage/deleted/expired documents are normalized out unless the
 * caller explicitly overrides status.
 */
export function buildVisibilityScope(input: {
  admin?: boolean;
  userId: string;
}): SQL[] {
  if (input.admin) return [];
  const { userId } = input;
  return [
    sql`(${dmsDocument.ownerId} = ${userId} OR EXISTS (
      SELECT 1 FROM dms_share s
      WHERE s.document_id = ${dmsDocument.id}
        AND s.grantee_id = ${userId}
        AND s.grantee_type = 'user'
        AND (s.expires_at IS NULL OR s.expires_at > now())
    ))`,
  ];
}

function buildSearchVector(query: string): SQL {
  return sql`(
    to_tsvector('simple', name)
    || to_tsvector('simple', coalesce(array_to_string(tags::text[], ' '), ''))
    || to_tsvector('simple', coalesce(metadata::text, ''))
    || to_tsvector('simple', coalesce(field_values::text, ''))
  ) @@ plainto_tsquery('simple', ${query})`;
}

function resolveSortField(field: string): SQL | null {
  switch (field) {
    case "createdAt":
      return dmsDocument.createdAt as unknown as SQL;
    case "size":
      return dmsDocument.size as unknown as SQL;
    case "updatedAt":
      return dmsDocument.updatedAt as unknown as SQL;
    case "name":
      return dmsDocument.name as unknown as SQL;
    default:
      return null;
  }
}

/**
 * Full-text search over catalogued document fields (name, tags, metadata,
 * class field values), scoped to the caller's visibility.
 */
export async function searchDocuments(
  db: DB,
  input: {
    classId?: string;
    contentType?: string;
    dateRange?: { end?: string | null; start?: string };
    limit: number;
    offset: number;
    query: string;
    scope: string;
    sizeRange?: { max?: number; min?: number };
    sort?: ViewSort[];
    status?: string;
    tags?: string[];
    userId: string;
    admin?: boolean;
  },
): Promise<DmsDocument[]> {
  void db;
  const conditions: SQL[] = [];
  conditions.push(buildSearchVector(input.query));

  if (input.status) {
    conditions.push(eq(dmsDocument.status, input.status as never));
  } else {
    conditions.push(eq(dmsDocument.status, "active"));
  }

  if (!input.admin && input.scope === "mine") {
    conditions.push(eq(dmsDocument.ownerId, input.userId));
  } else if (!input.admin && input.scope !== "mine") {
    conditions.push(
      ...buildVisibilityScope({ admin: false, userId: input.userId }),
    );
  }

  if (input.admin && input.scope === "mine") {
    conditions.push(eq(dmsDocument.ownerId, input.userId));
  }

  if (input.classId) conditions.push(eq(dmsDocument.classId, input.classId));
  if (input.contentType) {
    conditions.push(eq(dmsDocument.contentType, input.contentType));
  }
  if (input.tags && input.tags.length > 0) {
    for (const tag of input.tags) {
      conditions.push(sql`${dmsDocument.tags} ? ${tag}`);
    }
  }
  if (input.dateRange?.start) {
    conditions.push(
      gte(dmsDocument.createdAt, new Date(input.dateRange.start)),
    );
  }
  if (input.dateRange?.end) {
    conditions.push(lte(dmsDocument.createdAt, new Date(input.dateRange.end)));
  }
  if (input.sizeRange?.min !== undefined) {
    conditions.push(gte(dmsDocument.size, input.sizeRange.min));
  }
  if (input.sizeRange?.max !== undefined) {
    conditions.push(lte(dmsDocument.size, input.sizeRange.max));
  }

  const orderBy = buildSortOrder(input.sort, resolveSortField);
  if (orderBy.length === 0) {
    orderBy.push(desc(dmsDocument.createdAt) as unknown as SQL);
  }

  return db
    .select()
    .from(dmsDocument)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(input.limit)
    .offset(input.offset);
}

/**
 * Type-ahead quick search returning up to N documents with the matched field
 * highlighted, plus matching class names and tag names for completion.
 */
export async function quickSearch(
  db: DB,
  input: QuickSearchInput & { admin?: boolean; userId: string },
): Promise<QuickSearchResult> {
  const query = input.query;
  const limit = input.limit ?? 10;

  const docs = await searchDocuments(db, {
    admin: input.admin,
    limit,
    offset: 0,
    query,
    scope: "all",
    userId: input.userId,
  });

  const documents: QuickSearchHit[] = docs.map((doc) => {
    const found = findMatchInDocument(doc, query);
    return {
      document: doc,
      matched: found ?? { field: "name", value: doc.name },
    };
  });

  const classRows = await db
    .select({ name: dmsDocumentClass.name })
    .from(dmsDocumentClass)
    .where(ilike(dmsDocumentClass.name, `%${query}%`))
    .limit(5);
  const classes = classRows.map((r) => r.name);

  const tagRows = await db
    .select({ name: dmsTag.name })
    .from(dmsTag)
    .where(ilike(dmsTag.name, `%${query}%`))
    .limit(5);
  const tags = tagRows.map((r) => r.name);

  return { classes, documents, tags };
}

function findMatchInDocument(
  doc: DmsDocument,
  query: string,
): { field: string; value: string } | null {
  const q = query.toLowerCase();
  if (doc.name.toLowerCase().includes(q))
    return { field: "name", value: doc.name };

  const tags = doc.tags ?? [];
  for (const tag of tags) {
    if (tag.toLowerCase().includes(q)) return { field: "tag", value: tag };
  }

  const metadata = doc.metadata as Record<string, unknown> | null;
  if (metadata) {
    for (const [key, raw] of Object.entries(metadata)) {
      const value = String(raw ?? "");
      if (value.toLowerCase().includes(q)) {
        return { field: `metadata.${key}`, value };
      }
    }
  }

  const fields = doc.fieldValues as Record<string, unknown> | null;
  if (fields) {
    for (const [key, raw] of Object.entries(fields)) {
      const value = String(raw ?? "");
      if (value.toLowerCase().includes(q)) {
        return { field: `classField.${key}`, value };
      }
    }
  }

  return null;
}

/**
 * Converts a search's query + options into view filter/sort conditions so the
 * result can be promoted to a persisted view in one step.
 */
export function searchToViewConditions(input: {
  query: string;
  options: SearchOptions;
}): { filters: ViewCondition[]; sort: ViewSort[] } {
  const filters: ViewCondition[] = [
    { field: "search", operator: "search", value: input.query },
  ];
  if (input.options.classId) {
    filters.push({
      field: "class",
      operator: "eq",
      value: input.options.classId,
    });
  }
  if (input.options.contentType) {
    filters.push({
      field: "contentType",
      operator: "eq",
      value: input.options.contentType,
    });
  }
  for (const tag of input.options.tags ?? []) {
    filters.push({ field: "tag", operator: "eq", value: tag });
  }
  if (input.options.status && input.options.status !== "active") {
    filters.push({
      field: "status",
      operator: "eq",
      value: input.options.status,
    });
  }
  if (input.options.sizeRange?.min !== undefined) {
    filters.push({
      field: "size",
      operator: "gte",
      value: input.options.sizeRange.min,
    });
  }
  if (input.options.sizeRange?.max !== undefined) {
    filters.push({
      field: "size",
      operator: "lte",
      value: input.options.sizeRange.max,
    });
  }
  if (input.options.dateRange?.start) {
    filters.push({
      field: "createdAt",
      operator: "dateAfter",
      value: input.options.dateRange.start,
    });
  }
  if (input.options.dateRange?.end) {
    filters.push({
      field: "createdAt",
      operator: "dateBefore",
      value: input.options.dateRange.end,
    });
  }

  return { filters, sort: input.options.sort ?? [] };
}
