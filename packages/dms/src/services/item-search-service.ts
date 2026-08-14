import { getContext } from "@aspen-os/platform/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";

import * as schemas from "../db-schemas";
import type { DriveSearchOptions, SearchResult } from "../types";

export async function searchItems(opts: DriveSearchOptions): Promise<SearchResult> {
  const { db } = getContext();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const searchTerm = opts.query ? `%${opts.query}%` : null;

  const folderConditions = [eq(schemas.dmsFolder.isTrashed, false)];
  const fileConditions = [eq(schemas.dmsFile.isTrashed, false)];

  if (searchTerm) {
    const folderSearch = or(
      ilike(schemas.dmsFolder.name, searchTerm),
      ilike(schemas.dmsFolder.description, searchTerm),
    );
    if (folderSearch) {
      folderConditions.push(folderSearch);
    }

    const fileSearch = or(
      ilike(schemas.dmsFile.name, searchTerm),
      ilike(schemas.dmsFile.description, searchTerm),
    );
    if (fileSearch) {
      fileConditions.push(fileSearch);
    }
  }

  if (opts.ownerId) {
    folderConditions.push(eq(schemas.dmsFolder.ownerId, opts.ownerId));
    fileConditions.push(eq(schemas.dmsFile.ownerId, opts.ownerId));
  }

  if (opts.contentType) {
    fileConditions.push(eq(schemas.dmsFile.contentType, opts.contentType));
  }

  if (opts.dateFrom) {
    folderConditions.push(sql`${schemas.dmsFolder.createdAt} >= ${opts.dateFrom}`);
    fileConditions.push(sql`${schemas.dmsFile.createdAt} >= ${opts.dateFrom}`);
  }

  if (opts.dateTo) {
    folderConditions.push(sql`${schemas.dmsFolder.createdAt} <= ${opts.dateTo}`);
    fileConditions.push(sql`${schemas.dmsFile.createdAt} <= ${opts.dateTo}`);
  }

  if (opts.sizeMin !== undefined) {
    fileConditions.push(sql`${schemas.dmsFile.size} >= ${opts.sizeMin}`);
  }

  if (opts.sizeMax !== undefined) {
    fileConditions.push(sql`${schemas.dmsFile.size} <= ${opts.sizeMax}`);
  }

  let folders: (typeof schemas.dmsFolder.$inferSelect)[] = [];
  let files: (typeof schemas.dmsFile.$inferSelect)[] = [];

  if (!opts.type || opts.type === "folder") {
    folders = await db
      .select()
      .from(schemas.dmsFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);
  }

  if (!opts.type || opts.type === "file") {
    files = await db
      .select()
      .from(schemas.dmsFile)
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

async function filterByLabels<TItem extends { id: string }>(
  items: TItem[],
  itemType: "file" | "folder",
  labelIds: string[],
): Promise<TItem[]> {
  if (items.length === 0) {
    return items;
  }

  const { db } = getContext();
  const itemIds = items.map((item) => item.id);
  const labelledItems = await db
    .select({ itemId: schemas.dmsItemLabel.itemId })
    .from(schemas.dmsItemLabel)
    .where(
      and(
        eq(schemas.dmsItemLabel.itemType, itemType),
        sql`${schemas.dmsItemLabel.itemId} = ANY(${itemIds})`,
        sql`${schemas.dmsItemLabel.labelId} = ANY(${labelIds})`,
      ),
    );

  const labelledIds = new Set(labelledItems.map((label) => label.itemId));
  return items.filter((item) => labelledIds.has(item.id));
}
