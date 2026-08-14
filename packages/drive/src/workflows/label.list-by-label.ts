import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, optional, string } from "valibot";

import { driveFile, driveFolder, driveItemLabel } from "../db-schemas";

const ListByLabelSchema = object({
  labelId: string(),
  opts: optional(object({})),
});

export const listByLabel = Workflow.name("drive.label.list-by-label")
  .input(ListByLabelSchema)
  .handler(async ({ labelId }, ctx) => {
    const limit = 50;
    const offset = 0;

    const itemLabels = await ctx.db
      .select({
        itemId: driveItemLabel.itemId,
        itemType: driveItemLabel.itemType,
      })
      .from(driveItemLabel)
      .where(eq(driveItemLabel.labelId, labelId))
      .limit(limit)
      .offset(offset);

    const folderIds = itemLabels
      .filter((label) => label.itemType === "folder")
      .map((label) => label.itemId);
    const fileIds = itemLabels
      .filter((label) => label.itemType === "file")
      .map((label) => label.itemId);

    const folders =
      folderIds.length > 0
        ? await ctx.db
            .select()
            .from(driveFolder)
            .where(
              and(eq(driveFolder.isTrashed, false), sql`${driveFolder.id} = ANY(${folderIds})`),
            )
        : [];

    const files =
      fileIds.length > 0
        ? await ctx.db
            .select()
            .from(driveFile)
            .where(and(eq(driveFile.isTrashed, false), sql`${driveFile.id} = ANY(${fileIds})`))
        : [];

    return { files, folders };
  });
