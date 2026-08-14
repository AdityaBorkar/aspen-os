import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";

import { dmsFile, dmsFolder } from "../db-schemas";
import { WithIdSchema } from "./item-utils";
import { fetchItemFolderStep } from "./steps/fetch-item-folder";

export const getItemFolder = Workflow.name("dms.folder.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const fetched = await ctx.step.run(fetchItemFolderStep, { id });

    const [childCountRow] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(dmsFolder)
      .where(and(eq(dmsFolder.parentId, id), eq(dmsFolder.isTrashed, false)));

    const [fileCountRow] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(dmsFile)
      .where(and(eq(dmsFile.folderId, id), eq(dmsFile.isTrashed, false)));

    const [sizeRow] = await ctx.db
      .select({ totalSize: sql<number>`coalesce(sum(${dmsFile.size}), 0)` })
      .from(dmsFile)
      .where(and(sql`${dmsFile.path} like ${`${fetched.path}/%`}`, eq(dmsFile.isTrashed, false)));

    return {
      ...fetched,
      childCount: (childCountRow?.count ?? 0) + (fileCountRow?.count ?? 0),
      totalSize: sizeRow?.totalSize ?? 0,
    };
  });
