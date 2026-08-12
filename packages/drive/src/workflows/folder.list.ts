import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { parse } from "valibot";

import { driveFile, driveFolder } from "../db-schemas";
import type { ListFolderOptions } from "../types";
import { ListFolderOptionsSchema } from "../types";

export const listFolders = Workflow.name("drive.folder.list").handler(
  async (input, ctx) => {
    const { id, opts } = (input ?? {}) as {
      id?: string | null;
      opts?: ListFolderOptions;
    };
    const validated = parse(ListFolderOptionsSchema, opts ?? {});
    const limit = validated.limit ?? 50;
    const offset = validated.offset ?? 0;
    const sortBy = validated.sortBy ?? "name";
    const sortOrder = validated.sortOrder ?? "asc";

    const folderConditions = [
      eq(driveFolder.isTrashed, false),
      id ? eq(driveFolder.parentId, id) : sql`${driveFolder.parentId} IS NULL`,
    ];
    if (validated.search) {
      folderConditions.push(
        sql`${driveFolder.name} ilike ${`%${validated.search}%`}`,
      );
    }

    const folders = await ctx.db
      .select()
      .from(driveFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);

    const fileConditions = [
      eq(driveFile.isTrashed, false),
      id ? eq(driveFile.folderId, id) : sql`${driveFile.folderId} IS NULL`,
    ];
    if (validated.search) {
      fileConditions.push(
        sql`${driveFile.name} ilike ${`%${validated.search}%`}`,
      );
    }

    const files = await ctx.db
      .select()
      .from(driveFile)
      .where(and(...fileConditions))
      .limit(limit)
      .offset(offset);

    const sortFn = (a: { name: string }, b: { name: string }) => {
      const cmp = a.name.localeCompare(b.name);
      return sortOrder === "desc" ? -cmp : cmp;
    };

    return {
      files: files.sort(sortFn),
      folders: folders.sort(sortFn),
      sortBy,
      sortOrder,
    };
  },
);
