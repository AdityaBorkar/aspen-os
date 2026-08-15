import { activityLog } from "#/db-schemas/activity-log";
import { project } from "#/db-schemas/project";
import { savedView } from "#/db-schemas/saved-view";
import { status } from "#/db-schemas/status";
import { task } from "#/db-schemas/task";
import { taskAssignee } from "#/db-schemas/task-assignee";
import { taskType } from "#/db-schemas/task-type";
import { watcher } from "#/db-schemas/watcher";

import { and, eq, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export const MAX_NESTING_DEPTH = 3;

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export async function generateTaskNumber(
  db: DrizzleDB,
  projectId: string,
): Promise<{ displayNumber: string; taskSeq: number }> {
  const [proj] = await db.select().from(project).where(eq(project.id, projectId)).limit(1);

  if (!proj) {
    throw new Error(`Project with id "${projectId}" not found.`);
  }

  const taskSeq = proj.taskCounter + 1;

  await db.update(project).set({ taskCounter: taskSeq }).where(eq(project.id, projectId));

  return { displayNumber: `${proj.key}-${taskSeq}`, taskSeq };
}

export async function validateParentTask(
  db: DrizzleDB,
  options: {
    parentId: string;
    projectId: string;
    currentTaskId: string | undefined;
  },
): Promise<void> {
  const [parent] = await db.select().from(task).where(eq(task.id, options.parentId)).limit(1);

  if (!parent) {
    throw new Error(`Parent task with id "${options.parentId}" not found.`);
  }

  if (parent.projectId !== options.projectId) {
    throw new Error("Parent task must belong to the same project.");
  }

  if (options.currentTaskId) {
    const wouldCycle = await wouldCreateParentCycle(db, options.parentId, options.currentTaskId);
    if (wouldCycle) {
      throw new Error("Setting this parent would create a circular reference.");
    }
  }

  const depth = await getParentDepth(db, options.parentId);
  if (depth >= MAX_NESTING_DEPTH - 1) {
    throw new Error(`Maximum nesting depth of ${MAX_NESTING_DEPTH} levels would be exceeded.`);
  }
}

export async function wouldCreateParentCycle(
  db: DrizzleDB,
  parentId: string,
  taskId: string,
): Promise<boolean> {
  let currentId: string | null = parentId;
  let depth = 0;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    if (currentId === taskId) {
      return true;
    }
    if (depth >= MAX_NESTING_DEPTH) {
      return true;
    }

    const [parent] = await db
      .select({ parentId: task.parentId })
      .from(task)
      .where(eq(task.id, currentId))
      .limit(1);

    if (!parent) {
      break;
    }
    currentId = parent.parentId;
    depth++;
  }
  // oxlint-enable eslint/no-await-in-loop

  return false;
}

export async function getParentDepth(db: DrizzleDB, taskId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = taskId;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    const [parent] = await db
      .select({ parentId: task.parentId })
      .from(task)
      .where(eq(task.id, currentId))
      .limit(1);

    if (!parent?.parentId) {
      break;
    }
    currentId = parent.parentId;
    depth++;

    if (depth > MAX_NESTING_DEPTH) {
      throw new Error(`Task hierarchy exceeds maximum depth of ${MAX_NESTING_DEPTH}.`);
    }
  }
  // oxlint-enable eslint/no-await-in-loop

  return depth;
}

export async function unsetLeadAssignee(db: DrizzleDB, taskId: string): Promise<void> {
  await db
    .update(taskAssignee)
    .set({ isLead: false })
    .where(and(eq(taskAssignee.taskId, taskId), eq(taskAssignee.isLead, true)));
}

export async function ensureWatcher(db: DrizzleDB, taskId: string, userId: string): Promise<void> {
  const [existing] = await db
    .select({ id: watcher.id })
    .from(watcher)
    .where(and(eq(watcher.taskId, taskId), eq(watcher.userId, userId)))
    .limit(1);

  if (!existing) {
    await db.insert(watcher).values({ taskId, userId });
  }
}

export async function addActivity(
  db: DrizzleDB,
  options: {
    taskId: string;
    userId: string;
    action: string;
    oldValue: unknown;
    newValue: unknown;
  },
): Promise<void> {
  await db.insert(activityLog).values({
    action: options.action,
    newValue: options.newValue ? JSON.stringify(options.newValue) : null,
    oldValue: options.oldValue ? JSON.stringify(options.oldValue) : null,
    taskId: options.taskId,
    userId: options.userId,
  });
}

export async function ensureKeyUnique(
  db: DrizzleDB,
  key: string,
  excludeId: string | undefined,
): Promise<void> {
  const conditions = [eq(project.key, key)];
  if (excludeId) {
    conditions.push(sql`${project.id} != ${excludeId}`);
  }

  const [existing] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Project key "${key}" already exists.`);
  }
}

export async function unsetDefaultProjectStatus(
  db: DrizzleDB,
  projectId: string | null,
): Promise<void> {
  await db
    .update(status)
    .set({ isDefault: false })
    .where(projectId === null ? isNull(status.projectId) : eq(status.projectId, projectId));
}

export async function unsetDefaultTaskType(db: DrizzleDB, projectId: string): Promise<void> {
  await db.update(taskType).set({ isDefault: false }).where(eq(taskType.projectId, projectId));
}

export async function unsetDefaultSavedView(
  db: DrizzleDB,
  ownerId: string,
  projectId: string | null,
): Promise<void> {
  const conditions = [eq(savedView.ownerId, ownerId), eq(savedView.isDefault, true)];

  if (projectId) {
    conditions.push(eq(savedView.projectId, projectId));
  }

  await db
    .update(savedView)
    .set({ isDefault: false })
    .where(and(...conditions));
}

export function linkTypeInverse(linkType: string): string | undefined {
  const INVERSE_LINK_TYPES: Record<string, string> = {
    blocked_by: "blocks",
    blocks: "blocked_by",
    caused_by: "caused_by",
    duplicates: "duplicates",
    related_to: "related_to",
    split_from: "split_from",
  };
  return INVERSE_LINK_TYPES[linkType];
}
