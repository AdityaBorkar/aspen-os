import { task } from "#/db-schemas/task";
import { taskAssignee } from "#/db-schemas/task-assignee";
import type { TaskFilters } from "#/types";

import { and, eq, exists, ilike, isNull, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export function buildTaskWhereClause(filters: TaskFilters | undefined): SQL | undefined {
  if (!filters) {
    return undefined;
  }

  const conditions: SQL[] = [];

  if (filters.projectId) {
    conditions.push(eq(task.projectId, filters.projectId));
  }
  if (filters.statusId) {
    conditions.push(eq(task.statusId, filters.statusId));
  }
  if (filters.typeId) {
    conditions.push(eq(task.typeId, filters.typeId));
  }
  if (filters.priority) {
    conditions.push(eq(task.priority, filters.priority));
  }
  if (filters.reporterId) {
    conditions.push(eq(task.reporterId, filters.reporterId));
  }
  if (filters.parentId !== undefined) {
    if (filters.parentId === null) {
      conditions.push(isNull(task.parentId));
    } else {
      conditions.push(eq(task.parentId, filters.parentId));
    }
  }
  if (filters.isArchived !== undefined) {
    conditions.push(eq(task.isArchived, filters.isArchived));
  }
  if (filters.label) {
    conditions.push(sql`${task.labels} @> ARRAY[${filters.label}]::text[]`);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    const searchCondition = or(ilike(task.title, term), ilike(task.description, term));
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }
  if (filters.assigneeId) {
    conditions.push(
      exists(
        sql`select 1 from ${taskAssignee} where ${taskAssignee.taskId} = ${task.id} and ${taskAssignee.userId} = ${filters.assigneeId}`,
      ),
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}
