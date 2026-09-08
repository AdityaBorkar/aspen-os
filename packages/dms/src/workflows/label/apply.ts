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
        applied_by: parsed.appliedBy,
        entity_id: parsed.entityId,
        entity_type: parsed.entityType,
        label_id: parsed.labelId,
      })
      .onConflictDoNothing();

    return { applied: true };
  });
