import { and, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { timeEntry } from "../db-schema";
import type {
  CreateTimeEntryInput,
  TimeEntryFilters,
  UpdateTimeEntryInput,
} from "../types";
import {
  CreateTimeEntrySchema,
  TimeEntryFiltersSchema,
  UpdateTimeEntrySchema,
} from "../types";

export interface TimeEntryServiceDeps {
  db: NodePgDatabase;
}

export async function createTimeEntry(
  input: CreateTimeEntryInput,
  deps: TimeEntryServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateTimeEntrySchema, input);

  const [result] = await db
    .insert(timeEntry)
    .values({
      billable: parsed.billable ?? false,
      date: (parsed.date ?? new Date()).toISOString().slice(0, 10),
      description: parsed.description ?? null,
      duration: parsed.duration,
      taskId: parsed.taskId,
      userId: parsed.userId,
    })
    .returning();

  return result;
}

export async function updateTimeEntry(
  id: string,
  patch: UpdateTimeEntryInput,
  deps: TimeEntryServiceDeps,
) {
  const { db } = deps;
  await getTimeEntryById(id, deps);
  const parsed = parse(UpdateTimeEntrySchema, patch);

  const [updated] = await db
    .update(timeEntry)
    .set({
      billable: parsed.billable,
      date: parsed.date?.toISOString().slice(0, 10),
      description: parsed.description,
      duration: parsed.duration,
    })
    .where(eq(timeEntry.id, id))
    .returning();

  return updated;
}

export async function deleteTimeEntry(id: string, deps: TimeEntryServiceDeps) {
  const { db } = deps;
  await db.delete(timeEntry).where(eq(timeEntry.id, id));
}

export async function getTimeEntryById(id: string, deps: TimeEntryServiceDeps) {
  const { db } = deps;
  const [result] = await db
    .select()
    .from(timeEntry)
    .where(eq(timeEntry.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Time entry with id "${id}" not found.`);
  }

  return result;
}

export async function listTimeEntries(
  filters: TimeEntryFilters | undefined,
  deps: TimeEntryServiceDeps,
) {
  const { db } = deps;
  const parsed = filters ? parse(TimeEntryFiltersSchema, filters) : {};
  const conditions = [];

  if (parsed.taskId) {
    conditions.push(eq(timeEntry.taskId, parsed.taskId));
  }
  if (parsed.userId) {
    conditions.push(eq(timeEntry.userId, parsed.userId));
  }
  if (parsed.billable !== undefined) {
    conditions.push(eq(timeEntry.billable, parsed.billable));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(timeEntry)
    .where(whereClause)
    .orderBy(desc(timeEntry.date));
}

export async function getTotalDuration(
  taskId: string,
  billableOnly: boolean | undefined,
  deps: TimeEntryServiceDeps,
): Promise<number> {
  const { db } = deps;
  const conditions = [eq(timeEntry.taskId, taskId)];
  if (billableOnly) {
    conditions.push(eq(timeEntry.billable, true));
  }

  const [result] = await db
    .select({
      total: sql<string>`COALESCE(SUM(duration), 0)`,
    })
    .from(timeEntry)
    .where(and(...conditions));

  return result?.total ? Number.parseInt(result.total, 10) : 0;
}
