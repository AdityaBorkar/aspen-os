import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";

import { driveFile, driveFolder } from "../db-schemas";
import { fetchFolderStep } from "./steps/fetch-folder";
import { WithIdSchema } from "./utils";

export const getFolder = Workflow.name("drive.folder.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const fetched = await ctx.step.run(fetchFolderStep, { id });

    const [childCountRow] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(driveFolder)
      .where(and(eq(driveFolder.parentId, id), eq(driveFolder.isTrashed, false)));

    const [fileCountRow] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(driveFile)
      .where(and(eq(driveFile.folderId, id), eq(driveFile.isTrashed, false)));

    const [sizeRow] = await ctx.db
      .select({ totalSize: sql<number>`coalesce(sum(${driveFile.size}), 0)` })
      .from(driveFile)
      .where(
        and(sql`${driveFile.path} like ${`${fetched.path}/%`}`, eq(driveFile.isTrashed, false)),
      );

    return {
      ...fetched,
      childCount: (childCountRow?.count ?? 0) + (fileCountRow?.count ?? 0),
      totalSize: sizeRow?.totalSize ?? 0,
    };
  });
