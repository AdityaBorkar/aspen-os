import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { taskLink } from "../db-schema";
import {
  buildDependencyGraph,
  type DependencyGraphDeps,
  getCriticalPath,
  topologicalSort,
  wouldCreateCycle,
} from "../services/dependency-graph";
import type {
  CreateTaskLinkInput,
  CriticalPathResult,
  TaskDependencyNode,
} from "../types";
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

export interface LinkServiceDeps extends DependencyGraphDeps {
  db: NodePgDatabase;
}

export async function createTaskLink(
  input: CreateTaskLinkInput,
  deps: LinkServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateTaskLinkSchema, input);

  if (parsed.sourceId === parsed.targetId) {
    throw new Error("Cannot link a task to itself.");
  }

  if (parsed.linkType === "blocks") {
    const wouldCycle = await wouldCreateCycle(
      parsed.sourceId,
      parsed.targetId,
      deps,
    );
    if (wouldCycle) {
      throw new Error(
        "Creating this link would introduce a circular dependency.",
      );
    }
  }

  const [existing] = await db
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

  const [result] = await db
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
      parsed.targetId,
      parsed.sourceId,
      inverseType,
      deps,
    );
  }

  return result;
}

export async function deleteTaskLink(
  sourceId: string,
  targetId: string,
  deps: LinkServiceDeps,
) {
  const { db } = deps;
  const [link] = await db
    .select()
    .from(taskLink)
    .where(
      and(eq(taskLink.sourceId, sourceId), eq(taskLink.targetId, targetId)),
    )
    .limit(1);

  if (!link) {
    throw new Error("Task link not found.");
  }

  await db.delete(taskLink).where(eq(taskLink.id, link.id));

  const inverseType = INVERSE_LINK_TYPES[link.linkType];
  if (inverseType) {
    await db
      .delete(taskLink)
      .where(
        and(
          eq(taskLink.sourceId, targetId),
          eq(taskLink.targetId, sourceId),
          eq(taskLink.linkType, inverseType as LinkType),
        ),
      );
  }
}

export async function listLinksByTask(taskId: string, deps: LinkServiceDeps) {
  const { db } = deps;
  const outgoing = await db
    .select()
    .from(taskLink)
    .where(eq(taskLink.sourceId, taskId));

  const incoming = await db
    .select()
    .from(taskLink)
    .where(eq(taskLink.targetId, taskId));

  return { incoming, outgoing };
}

export async function topologicalSortTasks(
  taskIds: string[],
  deps: LinkServiceDeps,
): Promise<string[]> {
  return topologicalSort(taskIds, deps);
}

export async function getLinkCriticalPath(
  projectId: string,
  deps: LinkServiceDeps,
): Promise<CriticalPathResult> {
  return getCriticalPath(projectId, deps);
}

export async function getLinkDependencyGraph(
  taskIds: string[],
  deps: LinkServiceDeps,
): Promise<TaskDependencyNode[]> {
  return buildDependencyGraph(taskIds, deps);
}

async function createInverseLink(
  sourceId: string,
  targetId: string,
  linkType: string,
  deps: LinkServiceDeps,
): Promise<void> {
  const { db } = deps;
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
