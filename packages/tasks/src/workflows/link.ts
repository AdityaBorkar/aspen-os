import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { taskLink } from "../db-schema";
import {
  buildDependencyGraph,
  getCriticalPath,
  topologicalSort,
  wouldCreateCycle,
} from "../services/dependency-graph";
import type { CriticalPathResult, TaskDependencyNode } from "../types";
import { CreateTaskLinkSchema } from "../types";

const INVERSE_LINK_TYPES: Record<string, string> = {
  blocked_by: "blocks",
  blocks: "blocked_by",
  caused_by: "caused_by",
  duplicates: "duplicates",
  related_to: "related_to",
  split_from: "split_from",
};

type LinkType =
  | "blocks"
  | "blocked_by"
  | "related_to"
  | "duplicates"
  | "caused_by"
  | "split_from";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

async function createInverseLink(
  db: DrizzleDB,
  sourceId: string,
  targetId: string,
  linkType: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: taskLink.id })
    .from(taskLink)
    .where(
      and(
        eq(taskLink.sourceId, sourceId),
        eq(taskLink.targetId, targetId),
        eq(taskLink.linkType, linkType as LinkType),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(taskLink).values({
      linkType: linkType as LinkType,
      sourceId,
      targetId,
    });
  }
}

const createTaskLink = Workflow.name("link.create")
  .input(CreateTaskLinkSchema)
  .handler(async (parsed, ctx) => {
    if (parsed.sourceId === parsed.targetId) {
      throw new Error("Cannot link a task to itself.");
    }

    if (parsed.linkType === "blocks") {
      const wouldCycle = await wouldCreateCycle(
        parsed.sourceId,
        parsed.targetId,
      );
      if (wouldCycle) {
        throw new Error(
          "Creating this link would introduce a circular dependency.",
        );
      }
    }

    const [existing] = await ctx.db
      .select({ id: taskLink.id })
      .from(taskLink)
      .where(
        and(
          eq(taskLink.sourceId, parsed.sourceId),
          eq(taskLink.targetId, parsed.targetId),
          eq(taskLink.linkType, parsed.linkType),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("This task link already exists.");
    }

    const [result] = await ctx.db
      .insert(taskLink)
      .values({
        linkType: parsed.linkType,
        sourceId: parsed.sourceId,
        targetId: parsed.targetId,
      })
      .returning();

    const inverseType = INVERSE_LINK_TYPES[parsed.linkType];
    if (inverseType) {
      await createInverseLink(
        ctx.db,
        parsed.targetId,
        parsed.sourceId,
        inverseType,
      );
    }

    return result;
  });

const deleteTaskLink = Workflow.name("link.delete").handler(
  async (input: { sourceId: string; targetId: string }, ctx) => {
    const [link] = await ctx.db
      .select()
      .from(taskLink)
      .where(
        and(
          eq(taskLink.sourceId, input.sourceId),
          eq(taskLink.targetId, input.targetId),
        ),
      )
      .limit(1);

    if (!link) {
      throw new Error("Task link not found.");
    }

    await ctx.db.delete(taskLink).where(eq(taskLink.id, link.id));

    const inverseType = INVERSE_LINK_TYPES[link.linkType];
    if (inverseType) {
      await ctx.db
        .delete(taskLink)
        .where(
          and(
            eq(taskLink.sourceId, input.targetId),
            eq(taskLink.targetId, input.sourceId),
            eq(taskLink.linkType, inverseType as LinkType),
          ),
        );
    }
  },
);

const listLinksByTask = Workflow.name("link.list-by-task").handler(
  async (input: { taskId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      const outgoing = await ctx.db
        .select()
        .from(taskLink)
        .where(eq(taskLink.sourceId, input.taskId));

      const incoming = await ctx.db
        .select()
        .from(taskLink)
        .where(eq(taskLink.targetId, input.taskId));

      return { incoming, outgoing };
    });
  },
);

const topologicalSortTasks = Workflow.name("link.topological-sort").handler(
  async (input: { taskIds: string[] }, ctx): Promise<string[]> => {
    return ctx.step.run("query", async () => {
      return topologicalSort(input.taskIds);
    });
  },
);

const getLinkCriticalPath = Workflow.name("link.critical-path").handler(
  async (input: { projectId: string }, ctx): Promise<CriticalPathResult> => {
    return ctx.step.run("query", async () => {
      return getCriticalPath(input.projectId);
    });
  },
);

const getLinkDependencyGraph = Workflow.name("link.dependency-graph").handler(
  async (input: { taskIds: string[] }, ctx): Promise<TaskDependencyNode[]> => {
    return ctx.step.run("query", async () => {
      return buildDependencyGraph(input.taskIds);
    });
  },
);

export const links = {
  create: createTaskLink,
  delete: deleteTaskLink,
  getCriticalPath: getLinkCriticalPath,
  getDependencyGraph: getLinkDependencyGraph,
  listByTask: listLinksByTask,
  topologicalSort: topologicalSortTasks,
};
