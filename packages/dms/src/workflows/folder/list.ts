import { dmsFile, dmsFolder } from "#/db-schemas";
import { ListFolderOptionsSchema } from "#/types";
import type { DmsFile, ListFolderOptions } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { parse } from "valibot";

export const listFolders = Workflow.name("dms.folder.list").handler(async (input, ctx) => {
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
    eq(dmsFolder.isTrashed, false),
    id ? eq(dmsFolder.parentId, id) : sql`${dmsFolder.parentId} IS NULL`,
  ];
  if (validated.search) {
    folderConditions.push(sql`${dmsFolder.name} ilike ${`%${validated.search}%`}`);
  }

  const folders = await ctx.db
    .select()
    .from(dmsFolder)
    .where(and(...folderConditions))
    .limit(limit)
    .offset(offset);

  let files: DmsFile[] = [];
  if (id) {
    const fileConditions = [eq(dmsFile.status, "active"), eq(dmsFile.folderId, id)];
    if (validated.search) {
      fileConditions.push(sql`${dmsFile.name} ilike ${`%${validated.search}%`}`);
    }
    files = await ctx.db
      .select()
      .from(dmsFile)
      .where(and(...fileConditions))
      .limit(limit)
      .offset(offset);
  }

  const sortFn = (left: { name: string }, right: { name: string }) => {
    const cmp = left.name.localeCompare(right.name);
    return sortOrder === "desc" ? -cmp : cmp;
  };

  return {
    files: files.sort(sortFn),
    folders: folders.sort(sortFn),
    sortBy,
    sortOrder,
  };
});
