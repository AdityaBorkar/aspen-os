import { dmsClass, dmsFile, dmsFolder, dmsLabel } from "#/db-schemas";
import { buildSortOrder } from "#/services/condition-service";
import type {
  DmsFile,
  DmsFolder,
  FileViewCondition,
  FileViewSort,
  QuickSearchInput,
  SearchOptions,
} from "#/types";
import { toText } from "#/utils/to-text";

import { and, asc, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DB = PostgresJsDatabase;

export interface QuickSearchHit {
  file: DmsFile;
  matched: {
    field: string;
    value: string;
  };
}

export interface QuickSearchResult {
  classes: string[];
  files: QuickSearchHit[];
  labels: string[];
}

export interface FileSearchResult {
  files: DmsFile[];
  folders: DmsFolder[];
}

export interface SearchToFileViewConditions {
  filters: FileViewCondition[];
  sort: FileViewSort[];
}

export async function searchFolders(
  db: DB,
  input: {
    limit: number;
    offset: number;
    query: string;
  },
): Promise<DmsFolder[]> {
  return db
    .select()
    .from(dmsFolder)
    .where(and(eq(dmsFolder.isTrashed, false), ilike(dmsFolder.name, `%${input.query}%`)))
    .orderBy(asc(dmsFolder.name))
    .limit(input.limit)
    .offset(input.offset);
}

/**
 * Appends security-scoped visibility conditions for a caller: owner or grants
 * to the caller, plus org-wide access for admins (admin flag passed by the
 * caller). Triage/expired/trashed files are normalized out unless the caller
 * explicitly overrides status.
 */
export function buildVisibilityScope(input: { admin?: boolean; userId: string }): SQL[] {
  if (input.admin) {
    return [];
  }
  const { userId } = input;
  return [
    sql`(${dmsFile.ownerId} = ${userId} OR EXISTS (
      SELECT 1 FROM dms_share s
      WHERE s.entity_id = ${dmsFile.id}
        AND s.entity_type = 'file'
        AND s.grantee_id = ${userId}
        AND s.grantee_type = 'user'
        AND (s.expires_at IS NULL OR s.expires_at > now())
    ))`,
  ];
}

function buildSearchVector(query: string): SQL {
  return sql`(
    to_tsvector('simple', name)
    || to_tsvector('simple', coalesce(description, ''))
    || to_tsvector('simple', coalesce(metadata::text, ''))
    || to_tsvector('simple', coalesce(field_values::text, ''))
  ) @@ plainto_tsquery('simple', ${query})`;
}

function buildLabelCondition(labelIds: string[]): SQL {
  return sql`EXISTS (
    SELECT 1 FROM dms_entity_label el
    WHERE el.entity_id = ${dmsFile.id}
      AND el.entity_type = 'file'
      AND el.label_id IN (${sql.join(
        labelIds.map((id) => sql`${id}`),
        sql`, `,
      )})
  )`;
}

function resolveSortField(field: string): SQL | null {
  switch (field) {
    case "createdAt": {
      return sql`${dmsFile.createdAt}`;
    }
    case "size": {
      return sql`${dmsFile.size}`;
    }
    case "updatedAt": {
      return sql`${dmsFile.updatedAt}`;
    }
    case "name": {
      return sql`${dmsFile.name}`;
    }
    default: {
      return null;
    }
  }
}

/**
 * Full-text search over file fields (name, description, metadata, class field
 * values), scoped to the caller's visibility and the given status.
 */
export async function searchFiles(
  db: DB,
  input: {
    admin?: boolean;
    classId?: string;
    contentType?: string;
    dateRange?: { end?: string | null; start?: string };
    labels?: string[];
    limit: number;
    offset: number;
    query: string;
    scope: string;
    sizeRange?: { max?: number; min?: number };
    sort?: FileViewSort[];
    status?: string;
    userId: string;
  },
): Promise<DmsFile[]> {
  void db;
  const conditions: SQL[] = [];
  conditions.push(buildSearchVector(input.query));

  if (input.status) {
    conditions.push(eq(sql`${dmsFile.status}`, input.status));
  } else {
    conditions.push(eq(dmsFile.status, "active"));
  }

  if (!input.admin && input.scope === "mine") {
    conditions.push(eq(dmsFile.ownerId, input.userId));
  } else if (!input.admin && input.scope !== "mine") {
    conditions.push(...buildVisibilityScope({ admin: false, userId: input.userId }));
  }

  if (input.admin && input.scope === "mine") {
    conditions.push(eq(dmsFile.ownerId, input.userId));
  }

  if (input.classId) {
    conditions.push(eq(dmsFile.classId, input.classId));
  }
  if (input.contentType) {
    conditions.push(eq(dmsFile.contentType, input.contentType));
  }
  if (input.labels && input.labels.length > 0) {
    conditions.push(buildLabelCondition(input.labels));
  }
  if (input.dateRange?.start) {
    conditions.push(gte(dmsFile.createdAt, new Date(input.dateRange.start)));
  }
  if (input.dateRange?.end) {
    conditions.push(lte(dmsFile.createdAt, new Date(input.dateRange.end)));
  }
  if (input.sizeRange?.min !== undefined) {
    conditions.push(gte(dmsFile.size, input.sizeRange.min));
  }
  if (input.sizeRange?.max !== undefined) {
    conditions.push(lte(dmsFile.size, input.sizeRange.max));
  }

  const orderBy = buildSortOrder(input.sort, resolveSortField);
  if (orderBy.length === 0) {
    orderBy.push(desc(dmsFile.createdAt));
  }

  return db
    .select()
    .from(dmsFile)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(input.limit)
    .offset(input.offset);
}

/**
 * Name-based filesystem search over folders and loose files.
 */
export async function searchItems(
  db: DB,
  input: {
    folderId?: string | null;
    limit: number;
    offset: number;
    query: string;
    type?: "file" | "folder";
    userId: string;
  },
): Promise<FileSearchResult> {
  const folders: DmsFolder[] = [];
  const files: DmsFile[] = [];

  if (input.type !== "file") {
    const folderConditions = [
      eq(dmsFolder.isTrashed, false),
      ilike(dmsFolder.name, `%${input.query}%`),
    ];
    folders.push(
      ...(await db
        .select()
        .from(dmsFolder)
        .where(and(...folderConditions))
        .orderBy(asc(dmsFolder.name))
        .limit(input.limit)
        .offset(input.offset)),
    );
  }

  if (input.type !== "folder") {
    const fileConditions = [
      eq(dmsFile.status, "active"),
      sql`(${dmsFile.name} ilike ${`%${input.query}%`} OR coalesce(${dmsFile.description}, '') ilike ${`%${input.query}%`})`,
    ];
    files.push(
      ...(await db
        .select()
        .from(dmsFile)
        .where(and(...fileConditions))
        .orderBy(asc(dmsFile.name))
        .limit(input.limit)
        .offset(input.offset)),
    );
  }

  return { files, folders };
}

/**
 * Type-ahead quick search returning up to N files with the matched field
 * highlighted, plus matching class names and label names for completion.
 */
export async function quickSearch(
  db: DB,
  input: QuickSearchInput & { admin?: boolean; userId: string },
): Promise<QuickSearchResult> {
  const { query } = input;
  const limit = input.limit ?? 10;

  const docs = await searchFiles(db, {
    admin: input.admin,
    limit,
    offset: 0,
    query,
    scope: "all",
    userId: input.userId,
  });

  const files: QuickSearchHit[] = docs.map((file) => {
    const found = findMatchInFile(file, query);
    return {
      file,
      matched: found ?? { field: "name", value: file.name },
    };
  });

  const classRows = await db
    .select({ name: dmsClass.name })
    .from(dmsClass)
    .where(ilike(dmsClass.name, `%${query}%`))
    .limit(5);
  const classes = classRows.map((row) => row.name);

  const labelRows = await db
    .select({ name: dmsLabel.name })
    .from(dmsLabel)
    .where(ilike(dmsLabel.name, `%${query}%`))
    .limit(5);
  const labels = labelRows.map((row) => row.name);

  return { classes, files, labels };
}

function findMatchInFile(file: DmsFile, query: string): { field: string; value: string } | null {
  const normalized = query.toLowerCase();
  if (file.name.toLowerCase().includes(normalized)) {
    return { field: "name", value: file.name };
  }

  if (file.description?.toLowerCase().includes(normalized)) {
    return { field: "description", value: file.description };
  }

  const { metadata } = file;
  if (metadata) {
    for (const [key, raw] of Object.entries(metadata)) {
      const value = toText(raw);
      if (value.toLowerCase().includes(normalized)) {
        return { field: `metadata.${key}`, value };
      }
    }
  }

  const { fieldValues: fields } = file;
  if (fields) {
    for (const [key, raw] of Object.entries(fields)) {
      const value = toText(raw);
      if (value.toLowerCase().includes(normalized)) {
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
export function searchToFileViewConditions(input: {
  query: string;
  options: SearchOptions;
}): SearchToFileViewConditions {
  const filters: FileViewCondition[] = [
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
  for (const label of input.options.labels ?? []) {
    filters.push({ field: "label", operator: "eq", value: label });
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
