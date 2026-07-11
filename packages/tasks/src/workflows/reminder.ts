import { and, eq, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { reminder, task } from "../db-schema";
import type { NotificationBridge } from "../services/notification-bridge";
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

export class ReminderWorkflow {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly notificationBridge: NotificationBridge | null,
  ) {}

  async create(input: CreateReminderInput) {
    const parsed = parse(CreateReminderSchema, input);

    const [result] = await this.db
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

  async update(id: string, patch: UpdateReminderInput) {
    await this.getById(id);
    const parsed = parse(UpdateReminderSchema, patch);

    const [updated] = await this.db
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

  async delete(id: string) {
    await this.db.delete(reminder).where(eq(reminder.id, id));
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(reminder)
      .where(eq(reminder.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Reminder with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: ReminderFilters) {
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

    return this.db.select().from(reminder).where(whereClause);
  }

  async getPendingReminders() {
    return this.db
      .select()
      .from(reminder)
      .where(
        and(eq(reminder.isSent, false), lte(reminder.remindAt, new Date())),
      );
  }

  async processPendingReminders(): Promise<number> {
    const pending = await this.getPendingReminders();
    let processed = 0;

    for (const r of pending) {
      if (this.notificationBridge) {
        await this.notificationBridge.publishReminderFired({
          reminder: { id: r.id, type: r.type, userId: r.userId },
          taskId: r.taskId,
        });
      }

      await this.db
        .update(reminder)
        .set({ isSent: true })
        .where(eq(reminder.id, r.id));

      if (r.isRecurring && r.interval) {
        await this.scheduleNextOccurrence(r);
      }

      processed++;
    }

    return processed;
  }

  async createDueDateReminders(
    taskId: string,
    dueDate: Date,
    userId: string,
  ): Promise<void> {
    const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    const oneHourBefore = new Date(dueDate.getTime() - 60 * 60 * 1000);

    await this.db.insert(reminder).values([
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

  async createOverdueReminder(taskId: string, userId: string): Promise<void> {
    const [taskRow] = await this.db
      .select({ dueDate: task.dueDate })
      .from(task)
      .where(eq(task.id, taskId))
      .limit(1);

    if (!taskRow?.dueDate) return;

    await this.db.insert(reminder).values({
      interval: "daily",
      isRecurring: true,
      remindAt: new Date(),
      taskId,
      type: "overdue",
      userId,
    });
  }

  private async scheduleNextOccurrence(r: {
    id: string;
    interval: string | null;
    remindAt: Date;
    taskId: string;
    type: string;
    userId: string;
  }): Promise<void> {
    if (!r.interval) return;

    const nextDate = this.computeNextOccurrence(r.remindAt, r.interval);
    if (!nextDate) return;

    await this.db.insert(reminder).values({
      interval: r.interval,
      isRecurring: true,
      remindAt: nextDate,
      taskId: r.taskId,
      type: r.type as "due_date" | "custom" | "overdue",
      userId: r.userId,
    });
  }

  private computeNextOccurrence(current: Date, interval: string): Date | null {
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
}
