import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, optional, string } from "valibot";

import { dmsFile, dmsFolder, dmsItemLabel } from "../db-schemas";

const ListByLabelSchema = object({
  labelId: string(),
  opts: optional(object({})),
});

export const listItemsByLabel = Workflow.name("dms.label.list-by-label")
  .input(ListByLabelSchema)
  .handler(async ({ labelId }, ctx) => {
    const limit = 50;
    const offset = 0;

    const itemLabels = await ctx.db
      .select({
        itemId: dmsItemLabel.itemId,
        itemType: dmsItemLabel.itemType,
      })
      .from(dmsItemLabel)
      .where(eq(dmsItemLabel.labelId, labelId))
      .limit(limit)
      .offset(offset);

    const folderIds = itemLabels
      .filter((l) => l.itemType === "folder")
      .map((l) => l.itemId);
    const fileIds = itemLabels
      .filter((l) => l.itemType === "file")
      .map((l) => l.itemId);

    const folders =
      folderIds.length > 0
        ? await ctx.db
            .select()
            .from(dmsFolder)
            .where(
              and(
                eq(dmsFolder.isTrashed, false),
                sql`${dmsFolder.id} = ANY(${folderIds})`,
              ),
            )
        : [];

    const files =
      fileIds.length > 0
        ? await ctx.db
            .select()
            .from(dmsFile)
            .where(
              and(
                eq(dmsFile.isTrashed, false),
                sql`${dmsFile.id} = ANY(${fileIds})`,
              ),
            )
        : [];

    return { files, folders };
  });
