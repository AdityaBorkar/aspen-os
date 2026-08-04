import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import {
  activityLog,
  project,
  task,
  taskAssignee,
  timeEntry,
  watcher,
} from "../db-schema";
import type {
  AssignTaskInput,
  BulkUpdateTaskInput,
  CreateTaskInput,
  TaskCompletionSummary,
  TaskFilters,
  UpdateTaskInput,
} from "../types";
import {
  AssignTaskSchema,
  BulkUpdateTaskSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
} from "../types";
import { buildTaskWhereClause } from "../utils/filter-engine";

const MAX_NESTING_DEPTH = 3;

export interface TasksServiceDeps {
  db: NodePgDatabase;
}

export async function createTask(
  input: CreateTaskInput,
  deps: TasksServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateTaskSchema, input);

  if (parsed.parentId) {
    await validateParentTask(
      parsed.parentId,
      parsed.projectId,
      undefined,
      deps,
    );
  }

  const { displayNumber, taskSeq } = await generateTaskNumber(
    parsed.projectId,
    deps,
  );

  const [result] = await db
    .insert(task)
    .values({
      description: parsed.description ?? null,
      dueDate: parsed.dueDate ?? null,
      estimatedHours: parsed.estimatedHours?.toString() ?? null,
      labels: parsed.labels ?? [],
      number: displayNumber,
      parentId: parsed.parentId ?? null,
      priority: parsed.priority ?? "none",
      projectId: parsed.projectId,
      reporterId: parsed.reporterId,
      startDate: parsed.startDate ?? null,
      statusId: parsed.statusId,
      taskNumber: taskSeq,
      title: parsed.title,
      typeId: parsed.typeId ?? null,
    })
    .returning();

  if (!result) {
    throw new Error("Failed to create task.");
  }

  await addActivity(
    result.id,
    result.reporterId,
    "task_created",
    null,
    {
      id: result.id,
      title: result.title,
    },
    deps,
  );

  return result;
}

export async function updateTask(
  id: string,
  patch: UpdateTaskInput,
  deps: TasksServiceDeps,
) {
  const { db } = deps;
  const current = await getTaskById(id, deps);
  const parsed = parse(UpdateTaskSchema, patch);

  if (parsed.parentId !== undefined) {
    if (parsed.parentId !== null) {
      if (parsed.parentId === id) {
        throw new Error("A task cannot be its own parent.");
      }
      await validateParentTask(parsed.parentId, current.projectId, id, deps);
    }
  }

  const changes: Record<string, unknown> = {};

  const [updated] = await db
    .update(task)
    .set({
      description: parsed.description,
      dueDate: parsed.dueDate,
      estimatedHours: parsed.estimatedHours?.toString(),
      labels: parsed.labels,
      parentId: parsed.parentId,
      priority: parsed.priority,
      startDate: parsed.startDate,
      statusId: parsed.statusId,
      title: parsed.title,
      typeId: parsed.typeId,
      updatedAt: new Date(),
    })
    .where(eq(task.id, id))
    .returning();

  if (parsed.statusId && parsed.statusId !== current.statusId) {
    changes.statusId = { from: current.statusId, to: parsed.statusId };
    await addActivity(
      id,
      current.reporterId,
      "status_changed",
      { from: current.statusId },
      { to: parsed.statusId },
      deps,
    );
  }

  if (parsed.title && parsed.title !== current.title) {
    changes.title = { from: current.title, to: parsed.title };
  }

  await addActivity(
    id,
    current.reporterId,
    "task_updated",
    current,
    changes,
    deps,
  );

  return updated;
}

export async function deleteTask(id: string, deps: TasksServiceDeps) {
  const { db } = deps;
  await getTaskById(id, deps);
  await db.delete(task).where(eq(task.id, id));
}

export async function archiveTask(id: string, deps: TasksServiceDeps) {
  const { db } = deps;
  await getTaskById(id, deps);
  const [updated] = await db
    .update(task)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(task.id, id))
    .returning();
  return updated;
}

export async function restoreTask(id: string, deps: TasksServiceDeps) {
  const { db } = deps;
  await getTaskById(id, deps);
  const [updated] = await db
    .update(task)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(eq(task.id, id))
    .returning();
  return updated;
}

export async function bulkUpdateTask(
  input: BulkUpdateTaskInput,
  deps: TasksServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(BulkUpdateTaskSchema, input);
  const [updated] = await db
    .update(task)
    .set({
      ...parsed.patch,
      estimatedHours: parsed.patch.estimatedHours?.toString(),
      updatedAt: new Date(),
    })
    .where(inArray(task.id, parsed.ids))
    .returning();
  return updated;
}

export async function getTaskById(id: string, deps: TasksServiceDeps) {
  const { db } = deps;
  const [result] = await db.select().from(task).where(eq(task.id, id)).limit(1);

  if (!result) {
    throw new Error(`Task with id "${id}" not found.`);
  }

  return result;
}

export async function listTasks(
  filters: TaskFilters | undefined,
  deps: TasksServiceDeps,
) {
  const { db } = deps;
  const whereClause = buildTaskWhereClause(filters);
  return db
    .select()
    .from(task)
    .where(whereClause)
    .orderBy(desc(task.createdAt));
}

export async function getSubTasks(parentId: string, deps: TasksServiceDeps) {
  const { db } = deps;
  return db
    .select()
    .from(task)
    .where(eq(task.parentId, parentId))
    .orderBy(desc(task.createdAt));
}

export async function getCompletionSummary(
  parentId: string,
  deps: TasksServiceDeps,
): Promise<TaskCompletionSummary> {
  const subTasks = await getSubTasks(parentId, deps);
  const completed = subTasks.filter((t) => t.completedAt !== null).length;
  const total = subTasks.length;

  return {
    completedCount: completed,
    completionPercentage:
      total === 0 ? 0 : Math.round((completed / total) * 100),
    totalCount: total,
  };
}

export async function assignTask(
  input: AssignTaskInput,
  deps: TasksServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(AssignTaskSchema, input);
  await getTaskById(parsed.taskId, deps);

  if (parsed.isLead) {
    await unsetLeadAssignee(parsed.taskId, deps);
  }

  const [result] = await db
    .insert(taskAssignee)
    .values({
      assignedBy: parsed.assignedBy,
      isLead: parsed.isLead ?? false,
      taskId: parsed.taskId,
      userId: parsed.userId,
    })
    .returning();

  await ensureWatcher(parsed.taskId, parsed.userId, deps);
  await addActivity(
    parsed.taskId,
    parsed.assignedBy,
    "assignee_added",
    null,
    { userId: parsed.userId },
    deps,
  );

  return result;
}

export async function unassignTask(
  taskId: string,
  userId: string,
  deps: TasksServiceDeps,
) {
  const { db } = deps;
  await db
    .delete(taskAssignee)
    .where(
      and(eq(taskAssignee.taskId, taskId), eq(taskAssignee.userId, userId)),
    );

  await addActivity(taskId, userId, "assignee_removed", { userId }, null, deps);
}

export async function getAssignees(taskId: string, deps: TasksServiceDeps) {
  const { db } = deps;
  return db.select().from(taskAssignee).where(eq(taskAssignee.taskId, taskId));
}

export async function getLoggedHours(
  taskId: string,
  deps: TasksServiceDeps,
): Promise<number> {
  const { db } = deps;
  const [result] = await db
    .select({
      total: sql<string>`COALESCE(SUM(duration), 0)`,
    })
    .from(timeEntry)
    .where(eq(timeEntry.taskId, taskId));

  return result?.total ? Number.parseFloat(result.total) : 0;
}

async function generateTaskNumber(
  projectId: string,
  deps: TasksServiceDeps,
): Promise<{ displayNumber: string; taskSeq: number }> {
  const { db } = deps;
  const [proj] = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);

  if (!proj) {
    throw new Error(`Project with id "${projectId}" not found.`);
  }

  const taskSeq = proj.taskCounter + 1;

  await db
    .update(project)
    .set({ taskCounter: taskSeq })
    .where(eq(project.id, projectId));

  return { displayNumber: `${proj.key}-${taskSeq}`, taskSeq };
}

async function validateParentTask(
  parentId: string,
  projectId: string,
  currentTaskId: string | undefined,
  deps: TasksServiceDeps,
): Promise<void> {
  const { db } = deps;
  const [parent] = await db
    .select()
    .from(task)
    .where(eq(task.id, parentId))
    .limit(1);

  if (!parent) {
    throw new Error(`Parent task with id "${parentId}" not found.`);
  }

  if (parent.projectId !== projectId) {
    throw new Error("Parent task must belong to the same project.");
  }

  if (currentTaskId) {
    const wouldCycle = await wouldCreateParentCycle(
      parentId,
      currentTaskId,
      deps,
    );
    if (wouldCycle) {
      throw new Error("Setting this parent would create a circular reference.");
    }
  }

  const depth = await getParentDepth(parentId, deps);
  if (depth >= MAX_NESTING_DEPTH - 1) {
    throw new Error(
      `Maximum nesting depth of ${MAX_NESTING_DEPTH} levels would be exceeded.`,
    );
  }
}

async function wouldCreateParentCycle(
  parentId: string,
  taskId: string,
  deps: TasksServiceDeps,
): Promise<boolean> {
  const { db } = deps;
  let currentId: string | null = parentId;
  let depth = 0;

  while (currentId !== null) {
    if (currentId === taskId) return true;
    if (depth >= MAX_NESTING_DEPTH) return true;

    const [parent] = await db
      .select({ parentId: task.parentId })
      .from(task)
      .where(eq(task.id, currentId))
      .limit(1);

    if (!parent) break;
    currentId = parent.parentId;
    depth++;
  }

  return false;
}

async function getParentDepth(
  taskId: string,
  deps: TasksServiceDeps,
): Promise<number> {
  const { db } = deps;
  let depth = 0;
  let currentId: string | null = taskId;

  while (currentId !== null) {
    const [parent] = await db
      .select({ parentId: task.parentId })
      .from(task)
      .where(eq(task.id, currentId))
      .limit(1);

    if (!parent?.parentId) break;
    currentId = parent.parentId;
    depth++;

    if (depth > MAX_NESTING_DEPTH) {
      throw new Error(
        `Task hierarchy exceeds maximum depth of ${MAX_NESTING_DEPTH}.`,
      );
    }
  }

  return depth;
}

async function unsetLeadAssignee(
  taskId: string,
  deps: TasksServiceDeps,
): Promise<void> {
  const { db } = deps;
  await db
    .update(taskAssignee)
    .set({ isLead: false })
    .where(and(eq(taskAssignee.taskId, taskId), eq(taskAssignee.isLead, true)));
}

async function ensureWatcher(
  taskId: string,
  userId: string,
  deps: TasksServiceDeps,
): Promise<void> {
  const { db } = deps;
  const [existing] = await db
    .select({ id: watcher.id })
    .from(watcher)
    .where(and(eq(watcher.taskId, taskId), eq(watcher.userId, userId)))
    .limit(1);

  if (!existing) {
    await db.insert(watcher).values({ taskId, userId });
  }
}

async function addActivity(
  taskId: string,
  userId: string,
  action: string,
  oldValue: unknown,
  newValue: unknown,
  deps: TasksServiceDeps,
): Promise<void> {
  const { db } = deps;
  await db.insert(activityLog).values({
    action,
    newValue: newValue ? JSON.stringify(newValue) : null,
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    taskId,
    userId,
  });
}
