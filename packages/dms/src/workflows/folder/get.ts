import { dmsFile, dmsFolder } from "#/db-schemas";
import { WithIdSchema } from "#/types";
import { fetchFolderStep } from "#/workflow-steps/fetch-folder";

import { Workflow } from "@aspen-os/platform/server";
import { count, sql } from "drizzle-orm";

export const getFolder = Workflow.name("dms.folder.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const fetched = await ctx.step.run(fetchFolderStep, { id });

    const [[childFolders], [childFiles], [sizes]] = await Promise.all([
      ctx.db
        .select({ value: count() })
        .from(dmsFolder)
        .where(sql`${dmsFolder.parentId} = ${fetched.id} AND ${dmsFolder.isTrashed} = false`),
      ctx.db
        .select({ value: count() })
        .from(dmsFile)
        .where(sql`${dmsFile.folderId} = ${fetched.id} AND ${dmsFile.status} != 'trashed'`),
      ctx.db
        .select({ value: sql<number>`coalesce(sum(${dmsFile.size}), 0)` })
        .from(dmsFile)
        .where(sql`${dmsFile.path} like ${`${fetched.path}/%`} AND ${dmsFile.status} != 'trashed'`),
    ]);

    return {
      ...fetched,
      childCount: (childFolders?.value ?? 0) + (childFiles?.value ?? 0),
      totalSize: sizes?.value ?? 0,
    };
  });
