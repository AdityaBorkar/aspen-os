import { taskLink } from "#/db-schemas/task-link";
import { publishTaskUnlinked } from "#/services/notification-bridge";
import { IdSchema } from "#/types";
import { linkTypeInverse } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

export const deleteTaskLink = Workflow.name("link.delete")
  .input(object({ sourceId: IdSchema, targetId: IdSchema }))
  .handler(async ({ sourceId, targetId }, ctx) => {
    const [link] = await ctx.db
      .select()
      .from(taskLink)
      .where(and(eq(taskLink.sourceId, sourceId), eq(taskLink.targetId, targetId)))
      .limit(1);

    if (!link) {
      throw new Error("Task link not found.");
    }

    await ctx.db.delete(taskLink).where(eq(taskLink.id, link.id));

    const inverseType = linkTypeInverse(link.linkType);
    if (inverseType) {
      await ctx.db
        .delete(taskLink)
        .where(
          and(
            eq(taskLink.sourceId, targetId),
            eq(taskLink.targetId, sourceId),
            eq(taskLink.linkType, inverseType),
          ),
        );
    }

    await ctx.step.run("notify", async () => {
      await publishTaskUnlinked({ sourceId, targetId }, { pubsub: ctx.pubsub });
    });
  });
