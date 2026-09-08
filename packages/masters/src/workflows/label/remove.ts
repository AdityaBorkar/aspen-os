import { masterEntityLabel } from "#/db-schemas";
import { LABEL_EVENTS } from "#/pubsub";
import { RemoveLabelSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RemoveInputSchema = object({ input: RemoveLabelSchema });

export const removeLabel = Workflow.name("masters.label.remove")
  .input(RemoveInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RemoveLabelSchema, input);

    await ctx.db
      .delete(masterEntityLabel)
      .where(
        and(
          eq(masterEntityLabel.entity_id, parsed.entityId),
          eq(masterEntityLabel.entity_type, parsed.entityType),
          eq(masterEntityLabel.label_id, parsed.labelId),
        ),
      );

    await ctx.step.run("notify", async () => {
      await ctx.pubsub.publish(LABEL_EVENTS.REMOVED_FROM_ENTITY, {
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        labelId: parsed.labelId,
      });
    });

    return { removed: true };
  });
