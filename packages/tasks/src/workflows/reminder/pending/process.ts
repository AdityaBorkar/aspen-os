import { reminder } from "#/db-schemas/reminder";
import { REMINDER_EVENTS } from "#/pubsub";
import { getPendingReminders } from "#/workflows/reminder/pending/get";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type DrizzleDB = NodePgDatabase;

type ReminderType = "due_date" | "custom" | "overdue";

export const processPendingReminders = Workflow.name("reminder.process-pending").handler(
  async (_input: undefined, ctx) => {
    const pending = await getPendingReminders.run(undefined);

    await Promise.all(
      pending.map(async (row) => {
        await ctx.pubsub.publish(REMINDER_EVENTS.FIRED, {
          reminder: { id: row.id, type: row.type, userId: row.userId },
          taskId: row.taskId,
        });

        await ctx.db.update(reminder).set({ isSent: true }).where(eq(reminder.id, row.id));

        if (row.isRecurring && row.interval) {
          await scheduleNextOccurrence(ctx.db, row);
        }
      }),
    );

    return pending.length;
  },
);

async function scheduleNextOccurrence(
  db: DrizzleDB,
  row: {
    id: string;
    interval: string | null;
    remindAt: Date;
    taskId: string;
    type: ReminderType;
    userId: string;
  },
): Promise<void> {
  if (!row.interval) {
    return;
  }

  const nextDate = computeNextOccurrence(row.remindAt, row.interval);
  if (!nextDate) {
    return;
  }

  await db.insert(reminder).values({
    interval: row.interval,
    isRecurring: true,
    remindAt: nextDate,
    taskId: row.taskId,
    type: row.type,
    userId: row.userId,
  });
}

function computeNextOccurrence(current: Date, interval: string): Date | null {
  const next = new Date(current);

  switch (interval) {
    case "daily": {
      next.setDate(next.getDate() + 1);
      return next;
    }
    case "weekly": {
      next.setDate(next.getDate() + 7);
      return next;
    }
    case "monthly": {
      next.setMonth(next.getMonth() + 1);
      return next;
    }
    case "every_2_hours": {
      next.setHours(next.getHours() + 2);
      return next;
    }
    default: {
      return null;
    }
  }
}
