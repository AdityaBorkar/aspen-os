import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { parse } from "valibot";

import { timeEntry } from "../db-schema";
import type { TimeEntryFilters, UpdateTimeEntryInput } from "../types";
import {
  CreateTimeEntrySchema,
  TimeEntryFiltersSchema,
  UpdateTimeEntrySchema,
} from "../types";

const fetchTimeEntryStep = WorkflowStep.name("fetch-time-entry").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(timeEntry)
      .where(eq(timeEntry.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Time entry with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createTimeEntry = Workflow.name("time-entry.create")
  .input(CreateTimeEntrySchema)
  .handler(async (parsed, ctx) => {
    const [result] = await ctx.db
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
  });

const updateTimeEntry = Workflow.name("time-entry.update").handler(
  async (input: { id: string; patch: UpdateTimeEntryInput }, ctx) => {
    await ctx.step.run(fetchTimeEntryStep, { id: input.id });
    const parsed = parse(UpdateTimeEntrySchema, input.patch);

    const [updated] = await ctx.db
      .update(timeEntry)
      .set({
        billable: parsed.billable,
        date: parsed.date?.toISOString().slice(0, 10),
        description: parsed.description,
        duration: parsed.duration,
      })
      .where(eq(timeEntry.id, input.id))
      .returning();

    return updated;
  },
);

const deleteTimeEntry = Workflow.name("time-entry.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db.delete(timeEntry).where(eq(timeEntry.id, input.id));
  },
);

const getTimeEntryById = Workflow.name("time-entry.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchTimeEntryStep, { id: input.id });
  },
);

const listTimeEntries = Workflow.name("time-entry.list").handler(
  async (input: { filters?: TimeEntryFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters
        ? parse(TimeEntryFiltersSchema, input.filters)
        : {};
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

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select()
        .from(timeEntry)
        .where(whereClause)
        .orderBy(desc(timeEntry.date));
    });
  },
);

const getTotalDuration = Workflow.name("time-entry.total-duration").handler(
  async (input: { taskId: string; billableOnly?: boolean }, ctx) => {
    return ctx.step.run("query", async () => {
      const conditions = [eq(timeEntry.taskId, input.taskId)];
      if (input.billableOnly) {
        conditions.push(eq(timeEntry.billable, true));
      }

      const [result] = await ctx.db
        .select({
          total: sql<string>`COALESCE(SUM(duration), 0)`,
        })
        .from(timeEntry)
        .where(and(...conditions));

      return result?.total ? Number.parseInt(result.total, 10) : 0;
    });
  },
);

export const timeEntries = {
  create: createTimeEntry,
  delete: deleteTimeEntry,
  get: getTimeEntryById,
  getTotalDuration,
  list: listTimeEntries,
  update: updateTimeEntry,
};
