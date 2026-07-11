import { and, eq, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { task, taskLink } from "../db-schema";
import type { CriticalPathResult, TaskDependencyNode } from "../types";

export class DependencyGraphService {
  constructor(private readonly db: NodePgDatabase) {}

  async wouldCreateCycle(sourceId: string, targetId: string): Promise<boolean> {
    if (sourceId === targetId) return true;

    const visited = new Set<string>();
    const queue = [targetId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      if (current === sourceId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const blockingLinks = await this.db
        .select({ targetId: taskLink.targetId })
        .from(taskLink)
        .where(
          and(eq(taskLink.sourceId, current), eq(taskLink.linkType, "blocks")),
        );

      for (const link of blockingLinks) {
        queue.push(link.targetId);
      }
    }

    return false;
  }

  async getDependencies(taskId: string): Promise<string[]> {
    const links = await this.db
      .select({ targetId: taskLink.targetId })
      .from(taskLink)
      .where(
        and(eq(taskLink.sourceId, taskId), eq(taskLink.linkType, "blocks")),
      );

    return links.map((l) => l.targetId);
  }

  async getDependents(taskId: string): Promise<string[]> {
    const links = await this.db
      .select({ sourceId: taskLink.sourceId })
      .from(taskLink)
      .where(
        and(eq(taskLink.targetId, taskId), eq(taskLink.linkType, "blocks")),
      );

    return links.map((l) => l.sourceId);
  }

  async topologicalSort(taskIds: string[]): Promise<string[]> {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const id of taskIds) {
      adj.set(id, []);
      inDegree.set(id, 0);
    }

    const links = await this.db
      .select({
        linkType: taskLink.linkType,
        sourceId: taskLink.sourceId,
        targetId: taskLink.targetId,
      })
      .from(taskLink)
      .where(
        and(
          eq(taskLink.linkType, "blocks"),
          or(
            ...taskIds.flatMap((id) => [
              eq(taskLink.sourceId, id),
              eq(taskLink.targetId, id),
            ]),
          ),
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
      if (degree === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      sorted.push(current);

      for (const neighbor of adj.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== taskIds.length) {
      throw new Error(
        "Cannot topologically sort: cycle detected in task graph.",
      );
    }

    return sorted;
  }

  async getCriticalPath(projectId: string): Promise<CriticalPathResult> {
    const tasks = await this.db
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

    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const t of tasks) {
      adj.set(t.id, []);
      inDegree.set(t.id, 0);
    }

    const links = await this.db
      .select({
        sourceId: taskLink.sourceId,
        targetId: taskLink.targetId,
      })
      .from(taskLink)
      .where(
        and(
          eq(taskLink.linkType, "blocks"),
          or(...tasks.map((t) => eq(taskLink.sourceId, t.id))),
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

    for (const t of tasks) {
      if ((inDegree.get(t.id) ?? 0) === 0) {
        queue.push(t.id);
        maxDuration.set(
          t.id,
          this.parseHours(taskMap.get(t.id)?.estimatedHours),
        );
        parent.set(t.id, null);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const currentDuration = maxDuration.get(current) ?? 0;

      for (const neighbor of adj.get(current) ?? []) {
        const neighborDuration = this.parseHours(
          taskMap.get(neighbor)?.estimatedHours,
        );
        const newDuration = currentDuration + neighborDuration;

        if (newDuration > (maxDuration.get(neighbor) ?? 0)) {
          maxDuration.set(neighbor, newDuration);
          parent.set(neighbor, current);
        }

        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
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

  async buildDependencyGraph(taskIds: string[]): Promise<TaskDependencyNode[]> {
    const tasks = await this.db
      .select({
        id: task.id,
        title: task.title,
      })
      .from(task)
      .where(or(...taskIds.map((id) => eq(task.id, id))));

    const nodes: TaskDependencyNode[] = [];

    for (const t of tasks) {
      const deps = await this.getDependencies(t.id);
      nodes.push({ dependsOn: deps, id: t.id, title: t.title });
    }

    return nodes;
  }

  private parseHours(value: string | null | undefined): number {
    if (!value) return 0;
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
