import { getContext } from "@aspen-os/platform/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";

import * as schemas from "../db-schemas";
import type { SearchOptions, SearchResult } from "../types";

export async function search(opts: SearchOptions): Promise<SearchResult> {
  const { db } = getContext();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const searchTerm = opts.query ? `%${opts.query}%` : null;

  const folderConditions = [eq(schemas.driveFolder.isTrashed, false)];
  const fileConditions = [eq(schemas.driveFile.isTrashed, false)];

  if (searchTerm) {
    const folderSearch = or(
      ilike(schemas.driveFolder.name, searchTerm),
      ilike(schemas.driveFolder.description, searchTerm),
    );
    if (folderSearch) {
      folderConditions.push(folderSearch);
    }

    const fileSearch = or(
      ilike(schemas.driveFile.name, searchTerm),
      ilike(schemas.driveFile.description, searchTerm),
    );
    if (fileSearch) {
      fileConditions.push(fileSearch);
    }
  }

  if (opts.ownerId) {
    folderConditions.push(eq(schemas.driveFolder.ownerId, opts.ownerId));
    fileConditions.push(eq(schemas.driveFile.ownerId, opts.ownerId));
  }

  if (opts.contentType) {
    fileConditions.push(eq(schemas.driveFile.contentType, opts.contentType));
  }

  if (opts.dateFrom) {
    folderConditions.push(sql`${schemas.driveFolder.createdAt} >= ${opts.dateFrom}`);
    fileConditions.push(sql`${schemas.driveFile.createdAt} >= ${opts.dateFrom}`);
  }

  if (opts.dateTo) {
    folderConditions.push(sql`${schemas.driveFolder.createdAt} <= ${opts.dateTo}`);
    fileConditions.push(sql`${schemas.driveFile.createdAt} <= ${opts.dateTo}`);
  }

  if (opts.sizeMin !== undefined) {
    fileConditions.push(sql`${schemas.driveFile.size} >= ${opts.sizeMin}`);
  }

  if (opts.sizeMax !== undefined) {
    fileConditions.push(sql`${schemas.driveFile.size} <= ${opts.sizeMax}`);
  }

  let folders: (typeof schemas.driveFolder.$inferSelect)[] = [];
  let files: (typeof schemas.driveFile.$inferSelect)[] = [];

  if (!opts.type || opts.type === "folder") {
    folders = await db
      .select()
      .from(schemas.driveFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);
  }

  if (!opts.type || opts.type === "file") {
    files = await db
      .select()
      .from(schemas.driveFile)
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

async function filterByLabels<TValue extends { id: string }>(
  items: TValue[],
  itemType: "file" | "folder",
  labelIds: string[],
): Promise<TValue[]> {
  if (items.length === 0) {
    return items;
  }

  const { db } = getContext();
  const itemIds = items.map((item) => item.id);
  const labelledItems = await db
    .select({ itemId: schemas.driveItemLabel.itemId })
    .from(schemas.driveItemLabel)
    .where(
      and(
        eq(schemas.driveItemLabel.itemType, itemType),
        sql`${schemas.driveItemLabel.itemId} = ANY(${itemIds})`,
        sql`${schemas.driveItemLabel.labelId} = ANY(${labelIds})`,
      ),
    );

  const labelledIds = new Set(labelledItems.map((label) => label.itemId));
  return items.filter((item) => labelledIds.has(item.id));
}
