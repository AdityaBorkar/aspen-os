import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, optional, string } from "valibot";

import { dmsEntityLabel, dmsFile, dmsFolder } from "../../../db-schemas";

const ListByLabelSchema = object({
  labelId: string(),
  opts: optional(object({})),
});

export const listEntitiesByLabel = Workflow.name("dms.label.list-by-label")
  .input(ListByLabelSchema)
  .handler(async ({ labelId }, ctx) => {
    const limit = 50;
    const offset = 0;

    const entityLabels = await ctx.db
      .select({
        entityId: dmsEntityLabel.entityId,
        entityType: dmsEntityLabel.entityType,
      })
      .from(dmsEntityLabel)
      .where(eq(dmsEntityLabel.labelId, labelId))
      .limit(limit)
      .offset(offset);

    const folderIds = entityLabels
      .filter((label) => label.entityType === "folder")
      .map((label) => label.entityId);
    const fileIds = entityLabels
      .filter((label) => label.entityType === "file")
      .map((label) => label.entityId);

    const folders =
      folderIds.length > 0
        ? await ctx.db
            .select()
            .from(dmsFolder)
            .where(and(eq(dmsFolder.isTrashed, false), sql`${dmsFolder.id} = ANY(${folderIds})`))
        : [];

    const files =
      fileIds.length > 0
        ? await ctx.db
            .select()
            .from(dmsFile)
            .where(and(sql`${dmsFile.status} != 'trashed'`, sql`${dmsFile.id} = ANY(${fileIds})`))
        : [];

    return { files, folders };
  });
