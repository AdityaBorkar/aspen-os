import { activityLog } from "#/db-schemas/activity-log";
import { project } from "#/db-schemas/project";
import { savedView } from "#/db-schemas/saved-view";
import { status } from "#/db-schemas/status";
import { task } from "#/db-schemas/task";
import { taskAssignee } from "#/db-schemas/task-assignee";
import { taskType } from "#/db-schemas/task-type";
import { watcher } from "#/db-schemas/watcher";
import type { TaskLinkType } from "#/utils/constants";
import { TASK_LINK_TYPE } from "#/utils/constants";

import type { JsonValue, WorkflowContext } from "@aspen-os/platform/server";
import { and, eq, isNull, sql } from "drizzle-orm";

export const MAX_NESTING_DEPTH = 3;

type Db = WorkflowContext["db"];

export function requireRow<TRow>(rows: readonly TRow[], label: string, id: string): TRow {
  const [result] = rows;
  if (result === undefined) {
    throw new Error(`${label} with id "${id}" not found.`);
  }
  return result;
}

export async function generateTaskNumber(
  db: Db,
  projectId: string,
): Promise<{ displayNumber: string; taskSeq: number }> {
  const [proj] = await db
    .update(project)
    .set({ taskCounter: sql`${project.taskCounter} + 1` })
    .where(eq(project.id, projectId))
    .returning({ key: project.key, taskCounter: project.taskCounter });

  if (!proj) {
    throw new Error(`Project with id "${projectId}" not found.`);
  }

  return { displayNumber: `${proj.key}-${proj.taskCounter}`, taskSeq: proj.taskCounter };
}

export async function validateParentTask(
  db: Db,
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
  db: Db,
  parentId: string,
  taskId: string,
): Promise<boolean> {
  let currentId: string | null = parentId;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    if (currentId === taskId) {
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
  }
  // oxlint-enable eslint/no-await-in-loop

  return false;
}

export async function getParentDepth(db: Db, taskId: string): Promise<number> {
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

export async function unsetLeadAssignee(db: Db, taskId: string): Promise<void> {
  await db
    .update(taskAssignee)
    .set({ isLead: false })
    .where(and(eq(taskAssignee.taskId, taskId), eq(taskAssignee.isLead, true)));
}

export async function ensureWatcher(db: Db, taskId: string, userId: string): Promise<void> {
  await db.insert(watcher).values({ taskId, userId }).onConflictDoNothing();
}

export async function addActivity(
  db: Db,
  options: {
    taskId: string;
    userId: string;
    action: string;
    oldValue: JsonValue | null;
    newValue: JsonValue | null;
  },
): Promise<void> {
  await db.insert(activityLog).values({
    action: options.action,
    newValue: options.newValue ?? null,
    oldValue: options.oldValue ?? null,
    taskId: options.taskId,
    userId: options.userId,
  });
}

export async function ensureKeyUnique(db: Db, key: string, excludeId?: string): Promise<void> {
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

export async function unsetDefaultProjectStatus(db: Db, projectId: string | null): Promise<void> {
  await db
    .update(status)
    .set({ isDefault: false })
    .where(projectId === null ? isNull(status.projectId) : eq(status.projectId, projectId));
}

export async function unsetDefaultTaskType(db: Db, projectId: string): Promise<void> {
  await db.update(taskType).set({ isDefault: false }).where(eq(taskType.projectId, projectId));
}

export async function unsetDefaultSavedView(
  db: Db,
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

const INVERSE_LINK_TYPES = {
  [TASK_LINK_TYPE.BLOCKED_BY]: TASK_LINK_TYPE.BLOCKS,
  [TASK_LINK_TYPE.BLOCKS]: TASK_LINK_TYPE.BLOCKED_BY,
  [TASK_LINK_TYPE.CAUSED_BY]: TASK_LINK_TYPE.CAUSED_BY,
  [TASK_LINK_TYPE.DUPLICATES]: TASK_LINK_TYPE.DUPLICATES,
  [TASK_LINK_TYPE.RELATED_TO]: TASK_LINK_TYPE.RELATED_TO,
  [TASK_LINK_TYPE.SPLIT_FROM]: TASK_LINK_TYPE.SPLIT_FROM,
} as const satisfies Record<TaskLinkType, TaskLinkType>;

export function linkTypeInverse(linkType: TaskLinkType): TaskLinkType {
  return INVERSE_LINK_TYPES[linkType];
}
