import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { driveFile, driveFolder, driveItemLabel } from "../db-schema";
import type { SearchOptions, SearchResult } from "../types";

type DB = NodePgDatabase<Record<string, never>>;

export class SearchService {
  constructor(private db: DB) {}

  async search(opts: SearchOptions): Promise<SearchResult> {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    const searchTerm = opts.query ? `%${opts.query}%` : null;

    const folderConditions = [eq(driveFolder.isTrashed, false)];
    const fileConditions = [eq(driveFile.isTrashed, false)];

    if (searchTerm) {
      const folderSearch = or(
        ilike(driveFolder.name, searchTerm),
        ilike(driveFolder.description, searchTerm),
      );
      if (folderSearch) folderConditions.push(folderSearch);

      const fileSearch = or(
        ilike(driveFile.name, searchTerm),
        ilike(driveFile.description, searchTerm),
      );
      if (fileSearch) fileConditions.push(fileSearch);
    }

    if (opts.ownerId) {
      folderConditions.push(eq(driveFolder.ownerId, opts.ownerId));
      fileConditions.push(eq(driveFile.ownerId, opts.ownerId));
    }

    if (opts.contentType) {
      fileConditions.push(eq(driveFile.contentType, opts.contentType));
    }

    if (opts.dateFrom) {
      folderConditions.push(sql`${driveFolder.createdAt} >= ${opts.dateFrom}`);
      fileConditions.push(sql`${driveFile.createdAt} >= ${opts.dateFrom}`);
    }

    if (opts.dateTo) {
      folderConditions.push(sql`${driveFolder.createdAt} <= ${opts.dateTo}`);
      fileConditions.push(sql`${driveFile.createdAt} <= ${opts.dateTo}`);
    }

    if (opts.sizeMin !== undefined) {
      fileConditions.push(sql`${driveFile.size} >= ${opts.sizeMin}`);
    }

    if (opts.sizeMax !== undefined) {
      fileConditions.push(sql`${driveFile.size} <= ${opts.sizeMax}`);
    }

    let folders: (typeof driveFolder.$inferSelect)[] = [];
    let files: (typeof driveFile.$inferSelect)[] = [];

    if (!opts.type || opts.type === "folder") {
      folders = await this.db
        .select()
        .from(driveFolder)
        .where(and(...folderConditions))
        .limit(limit)
        .offset(offset);
    }

    if (!opts.type || opts.type === "file") {
      files = await this.db
        .select()
        .from(driveFile)
        .where(and(...fileConditions))
        .limit(limit)
        .offset(offset);
    }

    if (opts.labels && opts.labels.length > 0) {
      folders = await this.filterByLabels(folders, "folder", opts.labels);
      files = await this.filterByLabels(files, "file", opts.labels);
    }

    return { files, folders };
  }

  private async filterByLabels<T extends { id: string }>(
    items: T[],
    itemType: "file" | "folder",
    labelIds: string[],
  ): Promise<T[]> {
    if (items.length === 0) return items;

    const itemIds = items.map((i) => i.id);
    const labelledItems = await this.db
      .select({ itemId: driveItemLabel.itemId })
      .from(driveItemLabel)
      .where(
        and(
          eq(driveItemLabel.itemType, itemType),
          sql`${driveItemLabel.itemId} = ANY(${itemIds})`,
          sql`${driveItemLabel.labelId} = ANY(${labelIds})`,
        ),
      );

    const labelledIds = new Set(labelledItems.map((l) => l.itemId));
    return items.filter((i) => labelledIds.has(i.id));
  }
}
