import { masterEntityLabel } from "#/db-schemas";
import { LABEL_EVENTS } from "#/pubsub";
import { ApplyLabelSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ApplyInputSchema = object({ input: ApplyLabelSchema });

export const applyLabel = Workflow.name("masters.label.apply")
  .input(ApplyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ApplyLabelSchema, input);

    await ctx.db
      .insert(masterEntityLabel)
      .values({
        applied_by: parsed.appliedBy,
        entity_id: parsed.entityId,
        entity_type: parsed.entityType,
        label_id: parsed.labelId,
      })
      .onConflictDoNothing();

    await ctx.step.run("notify", async () => {
      await ctx.pubsub.publish(LABEL_EVENTS.APPLIED, {
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        labelId: parsed.labelId,
      });
    });

    return { applied: true };
  });
