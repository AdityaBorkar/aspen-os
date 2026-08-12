import { getContext } from "@aspen-os/platform/server";
import { and, count, eq, gte, lte, sql, sum } from "drizzle-orm";

import { task } from "../db-schemas/task";
import { taskAssignee } from "../db-schemas/task-assignee";
import { timeEntry } from "../db-schemas/time-entry";

export async function getTaskSummary(projectId: string): Promise<{
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  total: number;
}> {
  const { db } = getContext();

  const rows = await db
    .select({
      count: count(),
      priority: task.priority,
      statusId: task.statusId,
    })
    .from(task)
    .where(eq(task.projectId, projectId))
    .groupBy(task.priority, task.statusId);

  const byPriority: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const row of rows) {
    byPriority[row.priority] = (byPriority[row.priority] ?? 0) + row.count;
    byStatus[row.statusId] = (byStatus[row.statusId] ?? 0) + row.count;
  }

  const [totalRow] = await db
    .select({ total: count() })
    .from(task)
    .where(eq(task.projectId, projectId));

  return { byPriority, byStatus, total: totalRow?.total ?? 0 };
}

export async function getWorkloadReport(projectId: string): Promise<
  {
    assignedCount: number;
    completedCount: number;
    overdueCount: number;
    userId: string;
  }[]
> {
  const { db } = getContext();

  const rows = await db
    .select({
      assignedCount: count(),
      completedCount: sql<number>`SUM(CASE WHEN task.completed_at IS NOT NULL THEN 1 ELSE 0 END)`,
      overdueCount: sql<number>`SUM(CASE WHEN task.due_date IS NOT NULL AND task.due_date < NOW() AND task.completed_at IS NULL THEN 1 ELSE 0 END)`,
      userId: taskAssignee.userId,
    })
    .from(taskAssignee)
    .innerJoin(task, eq(taskAssignee.taskId, task.id))
    .where(eq(task.projectId, projectId))
    .groupBy(taskAssignee.userId);

  return rows;
}

export async function getTimeReport(
  projectId: string,
  dateFrom?: Date,
  dateTo?: Date,
) {
  const { db } = getContext();

  const conditions = [
    eq(timeEntry.taskId, task.id),
    eq(task.projectId, projectId),
  ];

  if (dateFrom) {
    conditions.push(gte(timeEntry.date, dateFrom.toISOString().slice(0, 10)));
  }
  if (dateTo) {
    conditions.push(lte(timeEntry.date, dateTo.toISOString().slice(0, 10)));
  }

  return db
    .select({
      billable: timeEntry.billable,
      duration: sum(timeEntry.duration),
      taskId: timeEntry.taskId,
      userId: timeEntry.userId,
    })
    .from(timeEntry)
    .innerJoin(task, eq(timeEntry.taskId, task.id))
    .where(and(...conditions))
    .groupBy(timeEntry.userId, timeEntry.taskId, timeEntry.billable);
}

export async function getCumulativeFlow(
  projectId: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<
  {
    count: number;
    date: string;
    statusId: string;
  }[]
> {
  const { db } = getContext();

  const result = await db.execute(sql`
    SELECT
      DATE(t.created_at) AS date,
      t.status_id AS status_id,
      COUNT(*) AS count
    FROM task t
    WHERE t.project_id = ${projectId}
      AND t.created_at BETWEEN ${dateFrom} AND ${dateTo}
    GROUP BY DATE(t.created_at), t.status_id
    ORDER BY DATE(t.created_at) ASC
  `);

  return (result.rows as Record<string, unknown>[]).map((row) => ({
    count: Number(row.count),
    date: row.date as string,
    statusId: row.status_id as string,
  }));
}
