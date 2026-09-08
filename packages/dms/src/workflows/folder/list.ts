import { dmsFile, dmsFolder } from "#/db-schemas";
import { escapeLike } from "#/services/search-service";
import { ListFolderOptionsSchema } from "#/types";
import type { DmsFile } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { nullable, object, optional, parse, string } from "valibot";

const ListFoldersInputSchema = object({
  id: optional(nullable(string())),
  opts: optional(ListFolderOptionsSchema),
});

export const listFolders = Workflow.name("dms.folder.list").handler(async (input, ctx) => {
  const { id, opts } = parse(ListFoldersInputSchema, input ?? {});
  const validated = parse(ListFolderOptionsSchema, opts ?? {});
  const limit = validated.limit ?? 50;
  const offset = validated.offset ?? 0;
  const sortBy = validated.sortBy ?? "name";
  const sortOrder = validated.sortOrder ?? "asc";

  const folderConditions = [
    eq(dmsFolder.is_trashed, false),
    id ? eq(dmsFolder.parent_id, id) : sql`${dmsFolder.parent_id} IS NULL`,
  ];
  if (validated.search) {
    folderConditions.push(sql`${dmsFolder.name} ilike ${`%${escapeLike(validated.search)}%`}`);
  }

  const folders = await ctx.db
    .select()
    .from(dmsFolder)
    .where(and(...folderConditions))
    .limit(limit)
    .offset(offset);

  let files: DmsFile[] = [];
  if (id) {
    const fileConditions = [eq(dmsFile.status, "active"), eq(dmsFile.folder_id, id)];
    if (validated.search) {
      fileConditions.push(sql`${dmsFile.name} ilike ${`%${escapeLike(validated.search)}%`}`);
    }
    files = await ctx.db
      .select()
      .from(dmsFile)
      .where(and(...fileConditions))
      .limit(limit)
      .offset(offset);
  }

  // Sorting is applied in memory after limit/offset, so pages are only
  // sorted within themselves — full cross-page ordering would need ORDER BY
  // in the queries above. Kept as-is to preserve existing behavior.
  const sortFn = (left: { name: string }, right: { name: string }) => {
    const cmp = left.name.localeCompare(right.name);
    return sortOrder === "desc" ? -cmp : cmp;
  };

  return {
    files: files.toSorted(sortFn),
    folders: folders.toSorted(sortFn),
    sortBy,
    sortOrder,
  };
});
