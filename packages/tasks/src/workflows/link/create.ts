import { taskLink } from "#/db-schemas/task-link";
import { TASK_EVENTS } from "#/pubsub";
import { CreateTaskLinkSchema } from "#/types";
import type { TaskLinkType } from "#/utils/constants";
import { TASK_LINK_TYPE } from "#/utils/constants";
import { wouldCreateCycle } from "#/workflow-steps/dependency-graph";
import { linkTypeInverse } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { object } from "valibot";

const BLOCKS_LINK_TYPE = TASK_LINK_TYPE.BLOCKS;

type DrizzleDB = PostgresJsDatabase;

const CreateInputSchema = object({
  input: CreateTaskLinkSchema,
});

async function linkExists(
  db: DrizzleDB,
  options: { sourceId: string; targetId: string; linkType: TaskLinkType },
): Promise<boolean> {
  const [existing] = await db
    .select({ id: taskLink.id })
    .from(taskLink)
    .where(
      and(
        eq(taskLink.sourceId, options.sourceId),
        eq(taskLink.targetId, options.targetId),
        eq(taskLink.linkType, options.linkType),
      ),
    )
    .limit(1);

  return Boolean(existing);
}

async function createInverseLink(
  db: DrizzleDB,
  options: {
    sourceId: string;
    targetId: string;
    linkType: TaskLinkType;
  },
): Promise<void> {
  if (await linkExists(db, options)) {
    return;
  }
  await db.insert(taskLink).values({
    linkType: options.linkType,
    sourceId: options.sourceId,
    targetId: options.targetId,
  });
}

export const createTaskLink = Workflow.name("link.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.sourceId === input.targetId) {
      throw new Error("Cannot link a task to itself.");
    }

    if (input.linkType === BLOCKS_LINK_TYPE) {
      const wouldCycleErr = await wouldCreateCycle(ctx.db, input.sourceId, input.targetId);
      if (wouldCycleErr) {
        throw new Error("Creating this link would introduce a circular dependency.");
      }
    }

    if (
      await linkExists(ctx.db, {
        linkType: input.linkType,
        sourceId: input.sourceId,
        targetId: input.targetId,
      })
    ) {
      throw new Error("This task link already exists.");
    }

    const [result] = await ctx.db
      .insert(taskLink)
      .values({
        linkType: input.linkType,
        sourceId: input.sourceId,
        targetId: input.targetId,
      })
      .returning();

    await createInverseLink(ctx.db, {
      linkType: linkTypeInverse(input.linkType),
      sourceId: input.targetId,
      targetId: input.sourceId,
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
