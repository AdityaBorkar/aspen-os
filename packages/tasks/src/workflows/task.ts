import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
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

type DrizzleDB = NodePgDatabase<Record<string, never>>;

const fetchTaskStep = WorkflowStep.name("fetch-task").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(task)
      .where(eq(task.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Task with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createTask = Workflow.name("task.create")
  .input(CreateTaskSchema)
  .handler(async (parsed, ctx) => {
    if (parsed.parentId) {
      await validateParentTask(
        ctx.db,
        parsed.parentId,
        parsed.projectId,
        undefined,
      );
    }

    const { displayNumber, taskSeq } = await generateTaskNumber(
      ctx.db,
      parsed.projectId,
    );

    const [result] = await ctx.db
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
      ctx.db,
      result.id,
      result.reporterId,
      "task_created",
      null,
      {
        id: result.id,
        title: result.title,
      },
    );

    return result;
  });

const updateTask = Workflow.name("task.update").handler(
  async (input: { id: string; patch: UpdateTaskInput }, ctx) => {
    const current = await ctx.step.run(fetchTaskStep, { id: input.id });
    const parsed = parse(UpdateTaskSchema, input.patch);

    if (parsed.parentId !== undefined) {
      if (parsed.parentId !== null) {
        if (parsed.parentId === input.id) {
          throw new Error("A task cannot be its own parent.");
        }
        await validateParentTask(
          ctx.db,
          parsed.parentId,
          current.projectId,
          input.id,
        );
      }
    }

    const changes: Record<string, unknown> = {};

    const [updated] = await ctx.db
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
      .where(eq(task.id, input.id))
      .returning();

    if (parsed.statusId && parsed.statusId !== current.statusId) {
      changes.statusId = { from: current.statusId, to: parsed.statusId };
      await addActivity(
        ctx.db,
        input.id,
        current.reporterId,
        "status_changed",
        { from: current.statusId },
        { to: parsed.statusId },
      );
    }

    if (parsed.title && parsed.title !== current.title) {
      changes.title = { from: current.title, to: parsed.title };
    }

    await addActivity(
      ctx.db,
      input.id,
      current.reporterId,
      "task_updated",
      current,
      changes,
    );

    return updated;
  },
);

const deleteTask = Workflow.name("task.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.step.run(fetchTaskStep, { id: input.id });
    await ctx.db.delete(task).where(eq(task.id, input.id));
  },
);

const archiveTask = Workflow.name("task.archive").handler(
  async (input: { id: string }, ctx) => {
    await ctx.step.run(fetchTaskStep, { id: input.id });
    const [updated] = await ctx.db
      .update(task)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(task.id, input.id))
      .returning();
    return updated;
  },
);

const restoreTask = Workflow.name("task.restore").handler(
  async (input: { id: string }, ctx) => {
    await ctx.step.run(fetchTaskStep, { id: input.id });
    const [updated] = await ctx.db
      .update(task)
      .set({ isArchived: false, updatedAt: new Date() })
      .where(eq(task.id, input.id))
      .returning();
    return updated;
  },
);

const bulkUpdateTask = Workflow.name("task.bulk-update")
  .input(BulkUpdateTaskSchema)
  .handler(async (parsed, ctx) => {
    const [updated] = await ctx.db
      .update(task)
      .set({
        ...parsed.patch,
        estimatedHours: parsed.patch.estimatedHours?.toString(),
        updatedAt: new Date(),
      })
      .where(inArray(task.id, parsed.ids))
      .returning();
    return updated;
  });

const getTaskById = Workflow.name("task.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchTaskStep, { id: input.id });
  },
);

const listTasks = Workflow.name("task.list").handler(
  async (input: { filters?: TaskFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const whereClause = buildTaskWhereClause(input.filters);
      return ctx.db
        .select()
        .from(task)
        .where(whereClause)
        .orderBy(desc(task.createdAt));
    });
  },
);

const getSubTasks = Workflow.name("task.sub-tasks").handler(
  async (input: { parentId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(task)
        .where(eq(task.parentId, input.parentId))
        .orderBy(desc(task.createdAt));
    });
  },
);

const getCompletionSummary = Workflow.name("task.completion-summary").handler(
  async (input: { parentId: string }, _ctx): Promise<TaskCompletionSummary> => {
    const subTasks = await getSubTasks.run({ parentId: input.parentId });
    const completed = subTasks.filter((t) => t.completedAt !== null).length;
    const total = subTasks.length;

    return {
      completedCount: completed,
      completionPercentage:
        total === 0 ? 0 : Math.round((completed / total) * 100),
      totalCount: total,
    };
  },
);

const assignTask = Workflow.name("task.assign")
  .input(AssignTaskSchema)
  .handler(async (parsed, ctx) => {
    await ctx.step.run(fetchTaskStep, { id: parsed.taskId });

    if (parsed.isLead) {
      await unsetLeadAssignee(ctx.db, parsed.taskId);
    }

    const [result] = await ctx.db
      .insert(taskAssignee)
      .values({
        assignedBy: parsed.assignedBy,
        isLead: parsed.isLead ?? false,
        taskId: parsed.taskId,
        userId: parsed.userId,
      })
      .returning();

    await ensureWatcher(ctx.db, parsed.taskId, parsed.userId);
    await addActivity(
      ctx.db,
      parsed.taskId,
      parsed.assignedBy,
      "assignee_added",
      null,
      { userId: parsed.userId },
    );

    return result;
  });

const unassignTask = Workflow.name("task.unassign").handler(
  async (input: { taskId: string; userId: string }, ctx) => {
    await ctx.db
      .delete(taskAssignee)
      .where(
        and(
          eq(taskAssignee.taskId, input.taskId),
          eq(taskAssignee.userId, input.userId),
        ),
      );

    await addActivity(
      ctx.db,
      input.taskId,
      input.userId,
      "assignee_removed",
      { userId: input.userId },
      null,
    );
  },
);

const getAssignees = Workflow.name("task.assignees").handler(
  async (input: { taskId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(taskAssignee)
        .where(eq(taskAssignee.taskId, input.taskId));
    });
  },
);

const getLoggedHours = Workflow.name("task.logged-hours").handler(
  async (input: { taskId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      const [result] = await ctx.db
        .select({
          total: sql<string>`COALESCE(SUM(duration), 0)`,
        })
        .from(timeEntry)
        .where(eq(timeEntry.taskId, input.taskId));

      return result?.total ? Number.parseFloat(result.total) : 0;
    });
  },
);

async function generateTaskNumber(
  db: DrizzleDB,
  projectId: string,
): Promise<{ displayNumber: string; taskSeq: number }> {
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
  db: DrizzleDB,
  parentId: string,
  projectId: string,
  currentTaskId: string | undefined,
): Promise<void> {
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
      db,
      parentId,
      currentTaskId,
    );
    if (wouldCycle) {
      throw new Error("Setting this parent would create a circular reference.");
    }
  }

  const depth = await getParentDepth(db, parentId);
  if (depth >= MAX_NESTING_DEPTH - 1) {
    throw new Error(
      `Maximum nesting depth of ${MAX_NESTING_DEPTH} levels would be exceeded.`,
    );
  }
}

async function wouldCreateParentCycle(
  db: DrizzleDB,
  parentId: string,
  taskId: string,
): Promise<boolean> {
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

async function getParentDepth(db: DrizzleDB, taskId: string): Promise<number> {
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

async function unsetLeadAssignee(db: DrizzleDB, taskId: string): Promise<void> {
  await db
    .update(taskAssignee)
    .set({ isLead: false })
    .where(and(eq(taskAssignee.taskId, taskId), eq(taskAssignee.isLead, true)));
}

async function ensureWatcher(
  db: DrizzleDB,
  taskId: string,
  userId: string,
): Promise<void> {
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
  db: DrizzleDB,
  taskId: string,
  userId: string,
  action: string,
  oldValue: unknown,
  newValue: unknown,
): Promise<void> {
  await db.insert(activityLog).values({
    action,
    newValue: newValue ? JSON.stringify(newValue) : null,
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    taskId,
    userId,
  });
}

export const tasks = {
  archive: archiveTask,
  assign: assignTask,
  bulkUpdate: bulkUpdateTask,
  create: createTask,
  delete: deleteTask,
  get: getTaskById,
  getAssignees,
  getCompletionSummary,
  getLoggedHours,
  getSubTasks,
  list: listTasks,
  restore: restoreTask,
  unassign: unassignTask,
  update: updateTask,
};
