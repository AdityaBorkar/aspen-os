import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object } from "valibot";

import { taskLink } from "../../db-schemas/task-link";
import { wouldCreateCycle } from "../../services/dependency-graph";
import { CreateTaskLinkSchema } from "../../types";
import { linkTypeInverse } from "../utils";

const BLOCKS_LINK_TYPE = "blocks";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

type LinkTypeValue =
  | "blocks"
  | "blocked_by"
  | "related_to"
  | "duplicates"
  | "caused_by"
  | "split_from";

const CreateInputSchema = object({
  input: CreateTaskLinkSchema,
});

async function createInverseLink(
  db: DrizzleDB,
  options: {
    sourceId: string;
    targetId: string;
    linkType: string;
  },
): Promise<void> {
  const [existing] = await db
    .select({ id: taskLink.id })
    .from(taskLink)
    .where(
      and(
        eq(taskLink.sourceId, options.sourceId),
        eq(taskLink.targetId, options.targetId),
        eq(taskLink.linkType, options.linkType as LinkTypeValue),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(taskLink).values({
      linkType: options.linkType as LinkTypeValue,
      sourceId: options.sourceId,
      targetId: options.targetId,
    });
  }
}

export const createTaskLink = Workflow.name("link.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.sourceId === input.targetId) {
      throw new Error("Cannot link a task to itself.");
    }

    if (input.linkType === BLOCKS_LINK_TYPE) {
      const wouldCycleErr = await wouldCreateCycle(input.sourceId, input.targetId);
      if (wouldCycleErr) {
        throw new Error("Creating this link would introduce a circular dependency.");
      }
    }

    const [existing] = await ctx.db
      .select({ id: taskLink.id })
      .from(taskLink)
      .where(
        and(
          eq(taskLink.sourceId, input.sourceId),
          eq(taskLink.targetId, input.targetId),
          eq(taskLink.linkType, input.linkType),
        ),
      )
      .limit(1);

    if (existing) {
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

    const inverseType = linkTypeInverse(input.linkType);
    if (inverseType) {
      await createInverseLink(ctx.db, {
        linkType: inverseType,
        sourceId: input.targetId,
        targetId: input.sourceId,
      });
    }

    return result;
  });
