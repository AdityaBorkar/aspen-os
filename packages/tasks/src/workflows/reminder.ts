import { and, eq, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { reminder, task } from "../db-schema";
import type { NotificationBridgeDeps } from "../services/notification-bridge";
import { publishReminderFired } from "../services/notification-bridge";
import type {
  CreateReminderInput,
  ReminderFilters,
  UpdateReminderInput,
} from "../types";
import {
  CreateReminderSchema,
  ReminderFiltersSchema,
  UpdateReminderSchema,
} from "../types";

export interface ReminderServiceDeps {
  db: NodePgDatabase;
  notificationBridge: NotificationBridgeDeps | null;
}

export async function createReminder(
  input: CreateReminderInput,
  deps: ReminderServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateReminderSchema, input);

  const [result] = await db
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
}

export async function updateReminder(
  id: string,
  patch: UpdateReminderInput,
  deps: ReminderServiceDeps,
) {
  const { db } = deps;
  await getReminderById(id, deps);
  const parsed = parse(UpdateReminderSchema, patch);

  const [updated] = await db
    .update(reminder)
    .set({
      interval: parsed.interval,
      isRecurring: parsed.isRecurring,
      isSent: parsed.isSent,
      message: parsed.message,
      remindAt: parsed.remindAt,
    })
    .where(eq(reminder.id, id))
    .returning();

  return updated;
}

export async function deleteReminder(id: string, deps: ReminderServiceDeps) {
  const { db } = deps;
  await db.delete(reminder).where(eq(reminder.id, id));
}

export async function getReminderById(id: string, deps: ReminderServiceDeps) {
  const { db } = deps;
  const [result] = await db
    .select()
    .from(reminder)
    .where(eq(reminder.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Reminder with id "${id}" not found.`);
  }

  return result;
}

export async function listReminders(
  filters: ReminderFilters | undefined,
  deps: ReminderServiceDeps,
) {
  const { db } = deps;
  const parsed = filters ? parse(ReminderFiltersSchema, filters) : {};
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

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db.select().from(reminder).where(whereClause);
}

export async function getPendingReminders(deps: ReminderServiceDeps) {
  const { db } = deps;
  return db
    .select()
    .from(reminder)
    .where(and(eq(reminder.isSent, false), lte(reminder.remindAt, new Date())));
}

export async function processPendingReminders(
  deps: ReminderServiceDeps,
): Promise<number> {
  const { db, notificationBridge } = deps;
  const pending = await getPendingReminders(deps);
  let processed = 0;

  for (const r of pending) {
    if (notificationBridge) {
      await publishReminderFired(
        {
          reminder: { id: r.id, type: r.type, userId: r.userId },
          taskId: r.taskId,
        },
        notificationBridge,
      );
    }

    await db
      .update(reminder)
      .set({ isSent: true })
      .where(eq(reminder.id, r.id));

    if (r.isRecurring && r.interval) {
      await scheduleNextOccurrence(r, deps);
    }

    processed++;
  }

  return processed;
}

export async function createDueDateReminders(
  taskId: string,
  dueDate: Date,
  userId: string,
  deps: ReminderServiceDeps,
): Promise<void> {
  const { db } = deps;
  const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
  const oneHourBefore = new Date(dueDate.getTime() - 60 * 60 * 1000);

  await db.insert(reminder).values([
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
}

export async function createOverdueReminder(
  taskId: string,
  userId: string,
  deps: ReminderServiceDeps,
): Promise<void> {
  const { db } = deps;
  const [taskRow] = await db
    .select({ dueDate: task.dueDate })
    .from(task)
    .where(eq(task.id, taskId))
    .limit(1);

  if (!taskRow?.dueDate) return;

  await db.insert(reminder).values({
    interval: "daily",
    isRecurring: true,
    remindAt: new Date(),
    taskId,
    type: "overdue",
    userId,
  });
}

async function scheduleNextOccurrence(
  r: {
    id: string;
    interval: string | null;
    remindAt: Date;
    taskId: string;
    type: string;
    userId: string;
  },
  deps: ReminderServiceDeps,
): Promise<void> {
  const { db } = deps;
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
