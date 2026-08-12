import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { reminder } from "../db-schemas/reminder";
import { REMINDER_EVENTS } from "../pubsub";
import { getPendingReminders } from "./reminder.get-pending";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

type ReminderType = "due_date" | "custom" | "overdue";

export const processPendingReminders = Workflow.name(
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
    type: r.type as ReminderType,
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
