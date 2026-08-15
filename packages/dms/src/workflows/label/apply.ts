import { dmsEntityLabel } from "#/db-schemas";
import { ApplyLabelSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ApplyInputSchema = object({ input: ApplyLabelSchema });

export const applyLabel = Workflow.name("dms.label.apply")
  .input(ApplyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ApplyLabelSchema, input);

    await ctx.db
      .insert(dmsEntityLabel)
      .values({
        appliedBy: parsed.appliedBy,
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        labelId: parsed.labelId,
      })
      .onConflictDoNothing();

    return { applied: true };
  });
