import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

import { dmsItemLabel } from "../db-schemas";
import { ItemTypeSchema } from "../types";

const RemoveLabelSchema = object({
  itemId: string(),
  itemType: ItemTypeSchema,
  labelId: string(),
});

export const removeItemLabel = Workflow.name("dms.label.remove")
  .input(RemoveLabelSchema)
  .handler(async ({ itemId, itemType, labelId }, ctx) => {
    await ctx.db
      .delete(dmsItemLabel)
      .where(
        and(
          eq(dmsItemLabel.itemId, itemId),
          eq(dmsItemLabel.itemType, itemType),
          eq(dmsItemLabel.labelId, labelId),
        ),
      );

    return { removed: true };
  });
