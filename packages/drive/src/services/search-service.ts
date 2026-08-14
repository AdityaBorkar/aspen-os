import { getContext } from "@aspen-os/platform/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";

import * as s from "../db-schemas";
import type { SearchOptions, SearchResult } from "../types";

export async function search(opts: SearchOptions): Promise<SearchResult> {
  const { db } = getContext();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const searchTerm = opts.query ? `%${opts.query}%` : null;

  const folderConditions = [eq(s.driveFolder.isTrashed, false)];
  const fileConditions = [eq(s.driveFile.isTrashed, false)];

  if (searchTerm) {
    const folderSearch = or(
      ilike(s.driveFolder.name, searchTerm),
      ilike(s.driveFolder.description, searchTerm),
    );
    if (folderSearch) {
      folderConditions.push(folderSearch);
    }

    const fileSearch = or(
      ilike(s.driveFile.name, searchTerm),
      ilike(s.driveFile.description, searchTerm),
    );
    if (fileSearch) {
      fileConditions.push(fileSearch);
    }
  }

  if (opts.ownerId) {
    folderConditions.push(eq(s.driveFolder.ownerId, opts.ownerId));
    fileConditions.push(eq(s.driveFile.ownerId, opts.ownerId));
  }

  if (opts.contentType) {
    fileConditions.push(eq(s.driveFile.contentType, opts.contentType));
  }

  if (opts.dateFrom) {
    folderConditions.push(sql`${s.driveFolder.createdAt} >= ${opts.dateFrom}`);
    fileConditions.push(sql`${s.driveFile.createdAt} >= ${opts.dateFrom}`);
  }

  if (opts.dateTo) {
    folderConditions.push(sql`${s.driveFolder.createdAt} <= ${opts.dateTo}`);
    fileConditions.push(sql`${s.driveFile.createdAt} <= ${opts.dateTo}`);
  }

  if (opts.sizeMin !== undefined) {
    fileConditions.push(sql`${s.driveFile.size} >= ${opts.sizeMin}`);
  }

  if (opts.sizeMax !== undefined) {
    fileConditions.push(sql`${s.driveFile.size} <= ${opts.sizeMax}`);
  }

  let folders: (typeof s.driveFolder.$inferSelect)[] = [];
  let files: (typeof s.driveFile.$inferSelect)[] = [];

  if (!opts.type || opts.type === "folder") {
    folders = await db
      .select()
      .from(s.driveFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);
  }

  if (!opts.type || opts.type === "file") {
    files = await db
      .select()
      .from(s.driveFile)
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
    .select({ itemId: s.driveItemLabel.itemId })
    .from(s.driveItemLabel)
    .where(
      and(
        eq(s.driveItemLabel.itemType, itemType),
        sql`${s.driveItemLabel.itemId} = ANY(${itemIds})`,
        sql`${s.driveItemLabel.labelId} = ANY(${labelIds})`,
      ),
    );

  const labelledIds = new Set(labelledItems.map((l) => l.itemId));
  return items.filter((i) => labelledIds.has(i.id));
}
