import { dmsEntityLabel, dmsFile, dmsFolder } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { object, optional, string } from "valibot";

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
        entityId: dmsEntityLabel.entity_id,
        entityType: dmsEntityLabel.entity_type,
      })
      .from(dmsEntityLabel)
      .where(eq(dmsEntityLabel.label_id, labelId))
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
            .where(and(eq(dmsFolder.is_trashed, false), inArray(dmsFolder.id, folderIds)))
        : [];

    const files =
      fileIds.length > 0
        ? await ctx.db
            .select()
            .from(dmsFile)
            .where(and(ne(dmsFile.status, "trashed"), inArray(dmsFile.id, fileIds)))
        : [];

    return { files, folders };
  });
