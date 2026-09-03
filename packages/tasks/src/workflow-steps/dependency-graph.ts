import { task } from "#/db-schemas/task";
import { taskLink } from "#/db-schemas/task-link";
import type { CriticalPathResult, TaskDependencyNode } from "#/types";
import { TASK_LINK_TYPE } from "#/utils/constants";

import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DrizzleDB = PostgresJsDatabase;

export async function wouldCreateCycle(
  db: DrizzleDB,
  sourceId: string,
  targetId: string,
): Promise<boolean> {
  if (sourceId === targetId) {
    return true;
  }

  const visited = new Set<string>();
  const queue = [targetId];
  let head = 0;

  // oxlint-disable eslint/no-await-in-loop
  while (head < queue.length) {
    const current = queue[head];
    if (current === undefined) {
      break;
    }
    head += 1;

    if (current === sourceId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const blockingLinks = await db
      .select({ targetId: taskLink.targetId })
      .from(taskLink)
      .where(and(eq(taskLink.sourceId, current), eq(taskLink.linkType, TASK_LINK_TYPE.BLOCKS)));

    for (const link of blockingLinks) {
      queue.push(link.targetId);
    }
  }
  // oxlint-enable eslint/no-await-in-loop

  return false;
}

export async function getDependencies(db: DrizzleDB, taskId: string): Promise<string[]> {
  const links = await db
    .select({ targetId: taskLink.targetId })
    .from(taskLink)
    .where(and(eq(taskLink.sourceId, taskId), eq(taskLink.linkType, TASK_LINK_TYPE.BLOCKS)));

  return links.map((link) => link.targetId);
}

export async function getDependents(db: DrizzleDB, taskId: string): Promise<string[]> {
  const links = await db
    .select({ sourceId: taskLink.sourceId })
    .from(taskLink)
    .where(and(eq(taskLink.targetId, taskId), eq(taskLink.linkType, TASK_LINK_TYPE.BLOCKS)));

  return links.map((link) => link.sourceId);
}

export async function topologicalSort(db: DrizzleDB, taskIds: string[]): Promise<string[]> {
  if (taskIds.length === 0) {
    return [];
  }

  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of taskIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  const links = await db
    .select({
      linkType: taskLink.linkType,
      sourceId: taskLink.sourceId,
      targetId: taskLink.targetId,
    })
    .from(taskLink)
    .where(
      and(
        eq(taskLink.linkType, TASK_LINK_TYPE.BLOCKS),
        inArray(taskLink.sourceId, taskIds),
        inArray(taskLink.targetId, taskIds),
      ),
    );

  for (const link of links) {
    if (adj.has(link.sourceId) && inDegree.has(link.targetId)) {
      adj.get(link.sourceId)?.push(link.targetId);
      inDegree.set(link.targetId, (inDegree.get(link.targetId) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    if (current === undefined) {
      break;
    }
    head += 1;
    sorted.push(current);

    for (const neighbor of adj.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== taskIds.length) {
    throw new Error("Cannot topologically sort: cycle detected in task graph.");
  }

  return sorted;
}

export async function getCriticalPath(
  db: DrizzleDB,
  projectId: string,
): Promise<CriticalPathResult> {
  const tasks = await db
    .select({
      estimatedHours: task.estimatedHours,
      id: task.id,
      title: task.title,
    })
    .from(task)
    .where(eq(task.projectId, projectId));

  if (tasks.length === 0) {
    return { duration: 0, path: [] };
  }

  const taskMap = new Map(tasks.map((taskRow) => [taskRow.id, taskRow]));
  const taskIds = tasks.map((taskRow) => taskRow.id);
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const taskRow of tasks) {
    adj.set(taskRow.id, []);
    inDegree.set(taskRow.id, 0);
  }

  const links = await db
    .select({
      sourceId: taskLink.sourceId,
      targetId: taskLink.targetId,
    })
    .from(taskLink)
    .where(
      and(
        eq(taskLink.linkType, TASK_LINK_TYPE.BLOCKS),
        inArray(taskLink.sourceId, taskIds),
        inArray(taskLink.targetId, taskIds),
      ),
    );

  for (const link of links) {
    if (adj.has(link.sourceId) && inDegree.has(link.targetId)) {
      adj.get(link.sourceId)?.push(link.targetId);
      inDegree.set(link.targetId, (inDegree.get(link.targetId) ?? 0) + 1);
    }
  }

  const maxDuration = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const queue: string[] = [];

  for (const taskRow of tasks) {
    if ((inDegree.get(taskRow.id) ?? 0) === 0) {
      queue.push(taskRow.id);
      maxDuration.set(taskRow.id, parseHours(taskMap.get(taskRow.id)?.estimatedHours));
      parent.set(taskRow.id, null);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    if (current === undefined) {
      break;
    }
    head += 1;
    const currentDuration = maxDuration.get(current) ?? 0;

    for (const neighbor of adj.get(current) ?? []) {
      const neighborDuration = parseHours(taskMap.get(neighbor)?.estimatedHours);
      const newDuration = currentDuration + neighborDuration;

      if (newDuration > (maxDuration.get(neighbor) ?? 0)) {
        maxDuration.set(neighbor, newDuration);
        parent.set(neighbor, current);
      }

      const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  let endNode: string | null = null;
  let maxPath = 0;
  for (const [id, duration] of maxDuration.entries()) {
    if (duration > maxPath) {
      maxPath = duration;
      endNode = id;
    }
  }

  if (!endNode) {
    return { duration: 0, path: [] };
  }

  const path: string[] = [];
  let current: string | null = endNode;
  while (current) {
    path.unshift(current);
    current = parent.get(current) ?? null;
  }

  return { duration: maxPath, path };
}

export async function buildDependencyGraph(
  db: DrizzleDB,
  taskIds: string[],
): Promise<TaskDependencyNode[]> {
  if (taskIds.length === 0) {
    return [];
  }

  const tasks = await db
    .select({
      id: task.id,
      title: task.title,
    })
    .from(task)
    .where(inArray(task.id, taskIds));

  const links = await db
    .select({ sourceId: taskLink.sourceId, targetId: taskLink.targetId })
    .from(taskLink)
    .where(
      and(
        eq(taskLink.linkType, TASK_LINK_TYPE.BLOCKS),
        inArray(taskLink.sourceId, taskIds),
        inArray(taskLink.targetId, taskIds),
      ),
    );

  const depsByTask = new Map<string, string[]>();
  for (const taskRow of tasks) {
    depsByTask.set(taskRow.id, []);
  }
  for (const link of links) {
    depsByTask.get(link.sourceId)?.push(link.targetId);
  }

  return tasks.map((taskRow) => ({
    dependsOn: depsByTask.get(taskRow.id) ?? [],
    id: taskRow.id,
    title: taskRow.title,
  }));
}

function parseHours(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
