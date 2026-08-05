import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { and, eq, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { reminder, task } from "../db-schema";
import { REMINDER_EVENTS } from "../pubsub-events";
import type { ReminderFilters, UpdateReminderInput } from "../types";
import {
  CreateReminderSchema,
  ReminderFiltersSchema,
  UpdateReminderSchema,
} from "../types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

const fetchReminderStep = WorkflowStep.name("fetch-reminder").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(reminder)
      .where(eq(reminder.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Reminder with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createReminder = Workflow.name("reminder.create")
  .input(CreateReminderSchema)
  .handler(async (parsed, ctx) => {
    const [result] = await ctx.db
      .insert(reminder)
      .values({
        interval: parsed.interval ?? null,
        isRecurring: parsed.isRecurring ?? false,
        message: parsed.message ?? null,
        remindAt: parsed.remindAt,
        taskId: parsed.taskId,
        type: parsed.type,
        userId: parsed.userId,
      })
      .returning();

    return result;
  });

const updateReminder = Workflow.name("reminder.update").handler(
  async (input: { id: string; patch: UpdateReminderInput }, ctx) => {
    await ctx.step.run(fetchReminderStep, { id: input.id });
    const parsed = parse(UpdateReminderSchema, input.patch);

    const [updated] = await ctx.db
      .update(reminder)
      .set({
        interval: parsed.interval,
        isRecurring: parsed.isRecurring,
        isSent: parsed.isSent,
        message: parsed.message,
        remindAt: parsed.remindAt,
      })
      .where(eq(reminder.id, input.id))
      .returning();

    return updated;
  },
);

const deleteReminder = Workflow.name("reminder.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db.delete(reminder).where(eq(reminder.id, input.id));
  },
);

const getReminderById = Workflow.name("reminder.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchReminderStep, { id: input.id });
  },
);

const listReminders = Workflow.name("reminder.list").handler(
  async (input: { filters?: ReminderFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters
        ? parse(ReminderFiltersSchema, input.filters)
        : {};
      const conditions = [];

      if (parsed.taskId) {
        conditions.push(eq(reminder.taskId, parsed.taskId));
      }
      if (parsed.userId) {
        conditions.push(eq(reminder.userId, parsed.userId));
      }
      if (parsed.type) {
        conditions.push(eq(reminder.type, parsed.type));
      }
      if (parsed.isSent !== undefined) {
        conditions.push(eq(reminder.isSent, parsed.isSent));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(reminder).where(whereClause);
    });
  },
);

const getPendingReminders = Workflow.name("reminder.get-pending").handler(
  async (_input: undefined, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(reminder)
        .where(
          and(eq(reminder.isSent, false), lte(reminder.remindAt, new Date())),
        );
    });
  },
);

const processPendingReminders = Workflow.name(
  "reminder.process-pending",
).handler(async (_input: undefined, ctx) => {
  const pending = await getPendingReminders.run(undefined);

  let processed = 0;

  for (const r of pending) {
    await ctx.pubsub.publish(REMINDER_EVENTS.FIRED, {
      reminder: { id: r.id, type: r.type, userId: r.userId },
      taskId: r.taskId,
    });

    await ctx.db
      .update(reminder)
      .set({ isSent: true })
      .where(eq(reminder.id, r.id));

    if (r.isRecurring && r.interval) {
      await scheduleNextOccurrence(ctx.db, r);
    }

    processed++;
  }

  return processed;
});

const createDueDateReminders = Workflow.name(
  "reminder.create-due-date",
).handler(
  async (input: { taskId: string; dueDate: Date; userId: string }, ctx) => {
    const { taskId, dueDate, userId } = input;
    const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    const oneHourBefore = new Date(dueDate.getTime() - 60 * 60 * 1000);

    await ctx.db.insert(reminder).values([
      {
        interval: null,
        isRecurring: false,
        remindAt: oneDayBefore,
        taskId,
        type: "due_date",
        userId,
      },
      {
        interval: null,
        isRecurring: false,
        remindAt: oneHourBefore,
        taskId,
        type: "due_date",
        userId,
      },
      {
        interval: null,
        isRecurring: false,
        remindAt: dueDate,
        taskId,
        type: "due_date",
        userId,
      },
    ]);
  },
);

const createOverdueReminder = Workflow.name("reminder.create-overdue").handler(
  async (input: { taskId: string; userId: string }, ctx) => {
    const { taskId, userId } = input;
    const [taskRow] = await ctx.db
      .select({ dueDate: task.dueDate })
      .from(task)
      .where(eq(task.id, taskId))
      .limit(1);

    if (!taskRow?.dueDate) return;

    await ctx.db.insert(reminder).values({
      interval: "daily",
      isRecurring: true,
      remindAt: new Date(),
      taskId,
      type: "overdue",
      userId,
    });
  },
);

async function scheduleNextOccurrence(
  db: DrizzleDB,
  r: {
    id: string;
    interval: string | null;
    remindAt: Date;
    taskId: string;
    type: string;
    userId: string;
  },
): Promise<void> {
  if (!r.interval) return;

  const nextDate = computeNextOccurrence(r.remindAt, r.interval);
  if (!nextDate) return;

  await db.insert(reminder).values({
    interval: r.interval,
    isRecurring: true,
    remindAt: nextDate,
    taskId: r.taskId,
    type: r.type as "due_date" | "custom" | "overdue",
    userId: r.userId,
  });
}

function computeNextOccurrence(current: Date, interval: string): Date | null {
  const next = new Date(current);

  switch (interval) {
    case "daily":
      next.setDate(next.getDate() + 1);
      return next;
    case "weekly":
      next.setDate(next.getDate() + 7);
      return next;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      return next;
    case "every_2_hours":
      next.setHours(next.getHours() + 2);
      return next;
    default:
      return null;
  }
}

export const reminders = {
  create: createReminder,
  createDueDateReminders,
  createOverdueReminder,
  delete: deleteReminder,
  get: getReminderById,
  getPending: getPendingReminders,
  list: listReminders,
  processPending: processPendingReminders,
  update: updateReminder,
};
