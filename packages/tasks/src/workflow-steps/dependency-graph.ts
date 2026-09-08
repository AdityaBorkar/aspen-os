import { task } from "#/db-schemas/task";
import { taskLink } from "#/db-schemas/task-link";
import type { CriticalPathResult, TaskDependencyNode } from "#/types";
import { TASK_LINK_TYPE } from "#/utils/constants";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";

type Db = WorkflowContext["db"];

interface BlocksSubgraph {
  adj: Map<string, string[]>;
  inDegree: Map<string, number>;
}

async function loadBlocksSubgraph(db: Db, taskIds: string[]): Promise<BlocksSubgraph> {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of taskIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  const links = await db
    .select({ sourceId: taskLink.source_id, targetId: taskLink.target_id })
    .from(taskLink)
    .where(
      and(
        eq(taskLink.link_type, TASK_LINK_TYPE.BLOCKS),
        inArray(taskLink.source_id, taskIds),
        inArray(taskLink.target_id, taskIds),
      ),
    );

  for (const link of links) {
    if (adj.has(link.sourceId) && inDegree.has(link.targetId)) {
      adj.get(link.sourceId)?.push(link.targetId);
      inDegree.set(link.targetId, (inDegree.get(link.targetId) ?? 0) + 1);
    }
  }

  return { adj, inDegree };
}

function kahnOrder(subgraph: BlocksSubgraph): string[] {
  const inDegree = new Map(subgraph.inDegree);
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

    for (const neighbor of subgraph.adj.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return sorted;
}

export async function wouldCreateCycle(
  db: Db,
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

    for (const next of await getDependencies(db, current)) {
      queue.push(next);
    }
  }
  // oxlint-enable eslint/no-await-in-loop

  return false;
}

export async function getDependencies(db: Db, taskId: string): Promise<string[]> {
  const links = await db
    .select({ targetId: taskLink.target_id })
    .from(taskLink)
    .where(and(eq(taskLink.source_id, taskId), eq(taskLink.link_type, TASK_LINK_TYPE.BLOCKS)));

  return links.map((link: { targetId: string }) => link.targetId);
}

export async function getDependents(db: Db, taskId: string): Promise<string[]> {
  const links = await db
    .select({ sourceId: taskLink.source_id })
    .from(taskLink)
    .where(and(eq(taskLink.target_id, taskId), eq(taskLink.link_type, TASK_LINK_TYPE.BLOCKS)));

  return links.map((link: { sourceId: string }) => link.sourceId);
}

export async function topologicalSort(db: Db, taskIds: string[]): Promise<string[]> {
  if (taskIds.length === 0) {
    return [];
  }

  const sorted = kahnOrder(await loadBlocksSubgraph(db, taskIds));

  if (sorted.length !== taskIds.length) {
    throw new Error("Cannot topologically sort: cycle detected in task graph.");
  }

  return sorted;
}

export async function getCriticalPath(db: Db, projectId: string): Promise<CriticalPathResult> {
  const tasks = await db
    .select({
      estimatedHours: task.estimated_hours,
      id: task.id,
      title: task.title,
    })
    .from(task)
    .where(eq(task.project_id, projectId));

  if (tasks.length === 0) {
    return { duration: 0, path: [] };
  }

  const taskMap = new Map<string, { estimatedHours: string | null; id: string; title: string }>(
    tasks.map((taskRow: { estimatedHours: string | null; id: string; title: string }) => [
      taskRow.id,
      taskRow,
    ]),
  );
  const taskIds = tasks.map(
    (taskRow: { estimatedHours: string | null; id: string; title: string }) => taskRow.id,
  );
  const { adj, inDegree } = await loadBlocksSubgraph(db, taskIds);
  const order = kahnOrder({ adj, inDegree });

  const maxDuration = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const taskRow of tasks) {
    if ((inDegree.get(taskRow.id) ?? 0) === 0) {
      maxDuration.set(taskRow.id, parseHours(taskMap.get(taskRow.id)?.estimatedHours));
      parent.set(taskRow.id, null);
    }
  }

  for (const current of order) {
    const currentDuration = maxDuration.get(current) ?? 0;

    for (const neighbor of adj.get(current) ?? []) {
      const neighborDuration = parseHours(taskMap.get(neighbor)?.estimatedHours);
      const newDuration = currentDuration + neighborDuration;

      if (newDuration > (maxDuration.get(neighbor) ?? 0)) {
        maxDuration.set(neighbor, newDuration);
        parent.set(neighbor, current);
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
  db: Db,
  taskIds: string[],
): Promise<TaskDependencyNode[]> {
  if (taskIds.length === 0) {
    return [];
  }

  const [tasks, { adj }] = await Promise.all([
    db
      .select({
        id: task.id,
        title: task.title,
      })
      .from(task)
      .where(inArray(task.id, taskIds)),
    loadBlocksSubgraph(db, taskIds),
  ]);

  return tasks.map((taskRow: { id: string; title: string }) => ({
    dependsOn: adj.get(taskRow.id) ?? [],
    id: taskRow.id,
    title: taskRow.title,
  }));
}

// Tasks without an estimate contribute zero duration to the critical path.
function parseHours(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
