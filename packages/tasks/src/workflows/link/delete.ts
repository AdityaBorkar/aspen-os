import { taskLink } from "#/db-schemas/task-link";
import { TASK_EVENTS } from "#/pubsub";
import { TaskLinkTypeSchema } from "#/schemas/enums";
import { IdSchema } from "#/types";
import { linkTypeInverse } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, safeParse } from "valibot";

export const deleteTaskLink = Workflow.name("link.delete")
  .input(object({ sourceId: IdSchema, targetId: IdSchema }))
  .handler(async ({ sourceId, targetId }, ctx) => {
    const [link] = await ctx.db
      .select()
      .from(taskLink)
      .where(and(eq(taskLink.sourceId, sourceId), eq(taskLink.targetId, targetId)))
      .limit(1);

    if (!link) {
      throw new Error(`Task link "${sourceId}" -> "${targetId}" not found.`);
    }

    const parsedLinkType = safeParse(TaskLinkTypeSchema, link.linkType);
    if (!parsedLinkType.success) {
      throw new Error(`Unknown task link type "${link.linkType}".`);
    }

    await ctx.db.transaction(async (tx) => {
      await Promise.all([
        tx.delete(taskLink).where(eq(taskLink.id, link.id)),
        tx
          .delete(taskLink)
          .where(
            and(
              eq(taskLink.sourceId, targetId),
              eq(taskLink.targetId, sourceId),
              eq(taskLink.linkType, linkTypeInverse(parsedLinkType.output)),
            ),
          ),
      ]);
    });

    await ctx.step.run("notify", async () => {
      await ctx.pubsub.publish(TASK_EVENTS.UNLINKED, { sourceId, targetId });
    });
  });
