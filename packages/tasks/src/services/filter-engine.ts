import {
  and,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import { task } from "../db-schema";
import type { TaskFilters } from "../types";

export class FilterEngine {
  buildTaskWhereClause(filters: TaskFilters | undefined): SQL | undefined {
    if (!filters) return undefined;

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
      conditions.push(
        or(ilike(task.title, term), ilike(task.description, term)) as SQL,
      );
    }
    if (filters.assigneeId) {
      conditions.push(
        sql`${task.id} IN (
          SELECT ta.task_id FROM task_assignee ta WHERE ta.user_id = ${filters.assigneeId}
        )`,
      );
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  buildDateRangeClause(
    column: typeof task.dueDate,
    before?: Date,
    after?: Date,
  ): SQL | undefined {
    const conditions: SQL[] = [];
    if (before) conditions.push(lte(column, before));
    if (after) conditions.push(gte(column, after));
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  buildArrayAnyClause(column: typeof task.labels, values: string[]): SQL {
    return sql`${column} && ${values}`;
  }

  buildArrayAllClause(column: typeof task.labels, values: string[]): SQL {
    return sql`${column} @> ${values}`;
  }

  buildEmptyClause(column: typeof task.dueDate, isEmpty: boolean): SQL {
    return isEmpty ? isNull(column) : isNotNull(column);
  }

  buildInClause(column: typeof task.priority, values: string[]): SQL {
    if (values.length === 0) return sql`1=1`;
    return inArray(column, values as never[]);
  }
}
