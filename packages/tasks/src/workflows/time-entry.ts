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

export class TimeEntryWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateTimeEntryInput) {
    const parsed = parse(CreateTimeEntrySchema, input);

    const [result] = await this.db
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

  async update(id: string, patch: UpdateTimeEntryInput) {
    await this.getById(id);
    const parsed = parse(UpdateTimeEntrySchema, patch);

    const [updated] = await this.db
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

  async delete(id: string) {
    await this.db.delete(timeEntry).where(eq(timeEntry.id, id));
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(timeEntry)
      .where(eq(timeEntry.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Time entry with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: TimeEntryFilters) {
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

    return this.db
      .select()
      .from(timeEntry)
      .where(whereClause)
      .orderBy(desc(timeEntry.date));
  }

  async getTotalDuration(
    taskId: string,
    billableOnly?: boolean,
  ): Promise<number> {
    const conditions = [eq(timeEntry.taskId, taskId)];
    if (billableOnly) {
      conditions.push(eq(timeEntry.billable, true));
    }

    const [result] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(duration), 0)`,
      })
      .from(timeEntry)
      .where(and(...conditions));

    return result?.total ? Number.parseInt(result.total, 10) : 0;
  }
}
