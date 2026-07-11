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
import { FilterEngine } from "../services/filter-engine";
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

const MAX_NESTING_DEPTH = 3;

export class TaskWorkflow {
  private readonly filterEngine = new FilterEngine();

  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateTaskInput) {
    const parsed = parse(CreateTaskSchema, input);

    if (parsed.parentId) {
      await this.validateParentTask(parsed.parentId, parsed.projectId);
    }

    const { displayNumber, taskSeq } = await this.generateTaskNumber(
      parsed.projectId,
    );

    const [result] = await this.db
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

    await this.addActivity(result.id, result.reporterId, "task_created", null, {
      id: result.id,
      title: result.title,
    });

    return result;
  }

  async update(id: string, patch: UpdateTaskInput) {
    const current = await this.getById(id);
    const parsed = parse(UpdateTaskSchema, patch);

    if (parsed.parentId !== undefined) {
      if (parsed.parentId !== null) {
        if (parsed.parentId === id) {
          throw new Error("A task cannot be its own parent.");
        }
        await this.validateParentTask(parsed.parentId, current.projectId, id);
      }
    }

    const changes: Record<string, unknown> = {};

    const [updated] = await this.db
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
      await this.addActivity(
        id,
        current.reporterId,
        "status_changed",
        {
          from: current.statusId,
        },
        { to: parsed.statusId },
      );
    }

    if (parsed.title && parsed.title !== current.title) {
      changes.title = { from: current.title, to: parsed.title };
    }

    await this.addActivity(
      id,
      current.reporterId,
      "task_updated",
      current,
      changes,
    );

    return updated;
  }

  async delete(id: string) {
    await this.getById(id);
    await this.db.delete(task).where(eq(task.id, id));
  }

  async archive(id: string) {
    await this.getById(id);
    const [updated] = await this.db
      .update(task)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(task.id, id))
      .returning();
    return updated;
  }

  async restore(id: string) {
    await this.getById(id);
    const [updated] = await this.db
      .update(task)
      .set({ isArchived: false, updatedAt: new Date() })
      .where(eq(task.id, id))
      .returning();
    return updated;
  }

  async bulkUpdate(input: BulkUpdateTaskInput) {
    const parsed = parse(BulkUpdateTaskSchema, input);
    const [updated] = await this.db
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

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(task)
      .where(eq(task.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Task with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: TaskFilters) {
    const whereClause = this.filterEngine.buildTaskWhereClause(filters);
    return this.db
      .select()
      .from(task)
      .where(whereClause)
      .orderBy(desc(task.createdAt));
  }

  async getSubTasks(parentId: string) {
    return this.db
      .select()
      .from(task)
      .where(eq(task.parentId, parentId))
      .orderBy(desc(task.createdAt));
  }

  async getCompletionSummary(parentId: string): Promise<TaskCompletionSummary> {
    const subTasks = await this.getSubTasks(parentId);
    const completed = subTasks.filter((t) => t.completedAt !== null).length;
    const total = subTasks.length;

    return {
      completedCount: completed,
      completionPercentage:
        total === 0 ? 0 : Math.round((completed / total) * 100),
      totalCount: total,
    };
  }

  async assign(input: AssignTaskInput) {
    const parsed = parse(AssignTaskSchema, input);
    await this.getById(parsed.taskId);

    if (parsed.isLead) {
      await this.unsetLeadAssignee(parsed.taskId);
    }

    const [result] = await this.db
      .insert(taskAssignee)
      .values({
        assignedBy: parsed.assignedBy,
        isLead: parsed.isLead ?? false,
        taskId: parsed.taskId,
        userId: parsed.userId,
      })
      .returning();

    await this.ensureWatcher(parsed.taskId, parsed.userId);
    await this.addActivity(
      parsed.taskId,
      parsed.assignedBy,
      "assignee_added",
      null,
      { userId: parsed.userId },
    );

    return result;
  }

  async unassign(taskId: string, userId: string) {
    await this.db
      .delete(taskAssignee)
      .where(
        and(eq(taskAssignee.taskId, taskId), eq(taskAssignee.userId, userId)),
      );

    await this.addActivity(
      taskId,
      userId,
      "assignee_removed",
      { userId },
      null,
    );
  }

  async getAssignees(taskId: string) {
    return this.db
      .select()
      .from(taskAssignee)
      .where(eq(taskAssignee.taskId, taskId));
  }

  async getLoggedHours(taskId: string): Promise<number> {
    const [result] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(duration), 0)`,
      })
      .from(timeEntry)
      .where(eq(timeEntry.taskId, taskId));

    return result?.total ? Number.parseFloat(result.total) : 0;
  }

  private async generateTaskNumber(
    projectId: string,
  ): Promise<{ displayNumber: string; taskSeq: number }> {
    const [proj] = await this.db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);

    if (!proj) {
      throw new Error(`Project with id "${projectId}" not found.`);
    }

    const taskSeq = proj.taskCounter + 1;

    await this.db
      .update(project)
      .set({ taskCounter: taskSeq })
      .where(eq(project.id, projectId));

    return { displayNumber: `${proj.key}-${taskSeq}`, taskSeq };
  }

  private async validateParentTask(
    parentId: string,
    projectId: string,
    currentTaskId?: string,
  ): Promise<void> {
    const [parent] = await this.db
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
      const wouldCycle = await this.wouldCreateParentCycle(
        parentId,
        currentTaskId,
      );
      if (wouldCycle) {
        throw new Error(
          "Setting this parent would create a circular reference.",
        );
      }
    }

    const depth = await this.getParentDepth(parentId);
    if (depth >= MAX_NESTING_DEPTH - 1) {
      throw new Error(
        `Maximum nesting depth of ${MAX_NESTING_DEPTH} levels would be exceeded.`,
      );
    }
  }

  private async wouldCreateParentCycle(
    parentId: string,
    taskId: string,
  ): Promise<boolean> {
    let currentId: string | null = parentId;
    let depth = 0;

    while (currentId !== null) {
      if (currentId === taskId) return true;
      if (depth >= MAX_NESTING_DEPTH) return true;

      const [parent] = await this.db
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

  private async getParentDepth(taskId: string): Promise<number> {
    let depth = 0;
    let currentId: string | null = taskId;

    while (currentId !== null) {
      const [parent] = await this.db
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

  private async unsetLeadAssignee(taskId: string): Promise<void> {
    await this.db
      .update(taskAssignee)
      .set({ isLead: false })
      .where(
        and(eq(taskAssignee.taskId, taskId), eq(taskAssignee.isLead, true)),
      );
  }

  private async ensureWatcher(taskId: string, userId: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: watcher.id })
      .from(watcher)
      .where(and(eq(watcher.taskId, taskId), eq(watcher.userId, userId)))
      .limit(1);

    if (!existing) {
      await this.db.insert(watcher).values({ taskId, userId });
    }
  }

  private async addActivity(
    taskId: string,
    userId: string,
    action: string,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> {
    await this.db.insert(activityLog).values({
      action,
      newValue: newValue ? JSON.stringify(newValue) : null,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      taskId,
      userId,
    });
  }
}
