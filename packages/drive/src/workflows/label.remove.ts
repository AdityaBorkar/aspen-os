import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

import { driveItemLabel } from "../db-schemas";
import { DriveItemTypeSchema } from "../types";

const RemoveLabelSchema = object({
  itemId: string(),
  itemType: DriveItemTypeSchema,
  labelId: string(),
});

export const removeLabel = Workflow.name("drive.label.remove")
  .input(RemoveLabelSchema)
  .handler(async ({ itemId, itemType, labelId }, ctx) => {
    await ctx.db
      .delete(driveItemLabel)
      .where(
        and(
          eq(driveItemLabel.itemId, itemId),
          eq(driveItemLabel.itemType, itemType),
          eq(driveItemLabel.labelId, labelId),
        ),
      );

    return { removed: true };
  });
