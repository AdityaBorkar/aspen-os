import { taskLink } from "#/db-schemas/task-link";
import { TASK_EVENTS } from "#/pubsub";
import { CreateTaskLinkSchema } from "#/types";
import type { TaskLinkType } from "#/utils/constants";
import { TASK_LINK_TYPE } from "#/utils/constants";
import { wouldCreateCycle } from "#/workflow-steps/dependency-graph";
import { linkTypeInverse } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

type Db = WorkflowContext["db"];

const CreateInputSchema = object({
  input: CreateTaskLinkSchema,
});

async function linkExists(
  db: Db,
  options: { sourceId: string; targetId: string; linkType: TaskLinkType },
): Promise<boolean> {
  const [existing] = await db
    .select({ id: taskLink.id })
    .from(taskLink)
    .where(
      and(
        eq(taskLink.source_id, options.sourceId),
        eq(taskLink.target_id, options.targetId),
        eq(taskLink.link_type, options.linkType),
      ),
    )
    .limit(1);

  return Boolean(existing);
}

async function createInverseLink(
  db: Db,
  options: {
    sourceId: string;
    targetId: string;
    linkType: TaskLinkType;
  },
): Promise<void> {
  await db
    .insert(taskLink)
    .values({
      link_type: options.linkType,
      source_id: options.sourceId,
      target_id: options.targetId,
    })
    .onConflictDoNothing();
}

export const createTaskLink = Workflow.name("link.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.sourceId === input.targetId) {
      throw new Error("Cannot link a task to itself.");
    }

    const [wouldCycle, exists] = await Promise.all([
      input.linkType === TASK_LINK_TYPE.BLOCKS
        ? wouldCreateCycle(ctx.db, input.sourceId, input.targetId)
        : Promise.resolve(false),
      linkExists(ctx.db, {
        linkType: input.linkType,
        sourceId: input.sourceId,
        targetId: input.targetId,
      }),
    ]);

    if (wouldCycle) {
      throw new Error("Creating this link would introduce a circular dependency.");
    }

    if (exists) {
      throw new Error("This task link already exists.");
    }

    const [result] = await ctx.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(taskLink)
        .values({
          link_type: input.linkType,
          source_id: input.sourceId,
          target_id: input.targetId,
        })
        .returning();

      await createInverseLink(tx, {
        linkType: linkTypeInverse(input.linkType),
        sourceId: input.targetId,
        targetId: input.sourceId,
      });

      return inserted;
    });

    await ctx.step.run("notify", async () => {
      await ctx.pubsub.publish(TASK_EVENTS.LINKED, {
        linkType: input.linkType,
        sourceId: input.sourceId,
        targetId: input.targetId,
      });
    });

    return result;
  });
