import { getContext } from "@aspen-os/platform/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";

import * as s from "../db-schemas";
import type { DriveSearchOptions, SearchResult } from "../types";

export async function searchItems(opts: DriveSearchOptions): Promise<SearchResult> {
  const { db } = getContext();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const searchTerm = opts.query ? `%${opts.query}%` : null;

  const folderConditions = [eq(s.dmsFolder.isTrashed, false)];
  const fileConditions = [eq(s.dmsFile.isTrashed, false)];

  if (searchTerm) {
    const folderSearch = or(
      ilike(s.dmsFolder.name, searchTerm),
      ilike(s.dmsFolder.description, searchTerm),
    );
    if (folderSearch) {
      folderConditions.push(folderSearch);
    }

    const fileSearch = or(
      ilike(s.dmsFile.name, searchTerm),
      ilike(s.dmsFile.description, searchTerm),
    );
    if (fileSearch) {
      fileConditions.push(fileSearch);
    }
  }

  if (opts.ownerId) {
    folderConditions.push(eq(s.dmsFolder.ownerId, opts.ownerId));
    fileConditions.push(eq(s.dmsFile.ownerId, opts.ownerId));
  }

  if (opts.contentType) {
    fileConditions.push(eq(s.dmsFile.contentType, opts.contentType));
  }

  if (opts.dateFrom) {
    folderConditions.push(sql`${s.dmsFolder.createdAt} >= ${opts.dateFrom}`);
    fileConditions.push(sql`${s.dmsFile.createdAt} >= ${opts.dateFrom}`);
  }

  if (opts.dateTo) {
    folderConditions.push(sql`${s.dmsFolder.createdAt} <= ${opts.dateTo}`);
    fileConditions.push(sql`${s.dmsFile.createdAt} <= ${opts.dateTo}`);
  }

  if (opts.sizeMin !== undefined) {
    fileConditions.push(sql`${s.dmsFile.size} >= ${opts.sizeMin}`);
  }

  if (opts.sizeMax !== undefined) {
    fileConditions.push(sql`${s.dmsFile.size} <= ${opts.sizeMax}`);
  }

  let folders: (typeof s.dmsFolder.$inferSelect)[] = [];
  let files: (typeof s.dmsFile.$inferSelect)[] = [];

  if (!opts.type || opts.type === "folder") {
    folders = await db
      .select()
      .from(s.dmsFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);
  }

  if (!opts.type || opts.type === "file") {
    files = await db
      .select()
      .from(s.dmsFile)
      .where(and(...fileConditions))
      .limit(limit)
      .offset(offset);
  }

  if (opts.labels && opts.labels.length > 0) {
    folders = await filterByLabels(folders, "folder", opts.labels);
    files = await filterByLabels(files, "file", opts.labels);
  }

  return { files, folders };
}

async function filterByLabels<T extends { id: string }>(
  items: T[],
  itemType: "file" | "folder",
  labelIds: string[],
): Promise<T[]> {
  if (items.length === 0) {
    return items;
  }

  const { db } = getContext();
  const itemIds = items.map((i) => i.id);
  const labelledItems = await db
    .select({ itemId: s.dmsItemLabel.itemId })
    .from(s.dmsItemLabel)
    .where(
      and(
        eq(s.dmsItemLabel.itemType, itemType),
        sql`${s.dmsItemLabel.itemId} = ANY(${itemIds})`,
        sql`${s.dmsItemLabel.labelId} = ANY(${labelIds})`,
      ),
    );

  const labelledIds = new Set(labelledItems.map((l) => l.itemId));
  return items.filter((i) => labelledIds.has(i.id));
}
