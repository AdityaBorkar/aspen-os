import { getContext } from "@aspen-os/platform/server";
import { and, eq, or } from "drizzle-orm";

import { task } from "../db-schemas/task";
import { taskLink } from "../db-schemas/task-link";
import type { CriticalPathResult, TaskDependencyNode } from "../types";

export async function wouldCreateCycle(sourceId: string, targetId: string): Promise<boolean> {
  const { db } = getContext();

  if (sourceId === targetId) {
    return true;
  }

  const visited = new Set<string>();
  const queue = [targetId];

  // oxlint-disable eslint/no-await-in-loop
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

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
      .where(and(eq(taskLink.sourceId, current), eq(taskLink.linkType, "blocks")));

    for (const link of blockingLinks) {
      queue.push(link.targetId);
    }
  }
  // oxlint-enable eslint/no-await-in-loop

  return false;
}

export async function getDependencies(taskId: string): Promise<string[]> {
  const { db } = getContext();

  const links = await db
    .select({ targetId: taskLink.targetId })
    .from(taskLink)
    .where(and(eq(taskLink.sourceId, taskId), eq(taskLink.linkType, "blocks")));

  return links.map((link) => link.targetId);
}

export async function getDependents(taskId: string): Promise<string[]> {
  const { db } = getContext();

  const links = await db
    .select({ sourceId: taskLink.sourceId })
    .from(taskLink)
    .where(and(eq(taskLink.targetId, taskId), eq(taskLink.linkType, "blocks")));

  return links.map((link) => link.sourceId);
}

export async function topologicalSort(taskIds: string[]): Promise<string[]> {
  const { db } = getContext();

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
        eq(taskLink.linkType, "blocks"),
        or(...taskIds.flatMap((id) => [eq(taskLink.sourceId, id), eq(taskLink.targetId, id)])),
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
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
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

export async function getCriticalPath(projectId: string): Promise<CriticalPathResult> {
  const { db } = getContext();

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
        eq(taskLink.linkType, "blocks"),
        or(...tasks.map((taskRow) => eq(taskLink.sourceId, taskRow.id))),
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

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
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

export async function buildDependencyGraph(taskIds: string[]): Promise<TaskDependencyNode[]> {
  const { db } = getContext();

  const tasks = await db
    .select({
      id: task.id,
      title: task.title,
    })
    .from(task)
    .where(or(...taskIds.map((id) => eq(task.id, id))));

  const nodes = await Promise.all(
    tasks.map(async (taskRow) => {
      const deps = await getDependencies(taskRow.id);
      return { dependsOn: deps, id: taskRow.id, title: taskRow.title };
    }),
  );

  return nodes;
}

function parseHours(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
