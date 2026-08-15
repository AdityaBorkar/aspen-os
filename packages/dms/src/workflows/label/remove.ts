import { dmsEntityLabel } from "#/db-schemas";
import { EntityTypeSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

const RemoveLabelSchema = object({
  entityId: string(),
  entityType: EntityTypeSchema,
  labelId: string(),
});

export const removeLabel = Workflow.name("dms.label.remove")
  .input(RemoveLabelSchema)
  .handler(async ({ entityId, entityType, labelId }, ctx) => {
    await ctx.db
      .delete(dmsEntityLabel)
      .where(
        and(
          eq(dmsEntityLabel.entityId, entityId),
          eq(dmsEntityLabel.entityType, entityType),
          eq(dmsEntityLabel.labelId, labelId),
        ),
      );

    return { removed: true };
  });
