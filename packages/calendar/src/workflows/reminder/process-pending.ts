import { calendarReminder } from "#/db-schemas";
import { REMINDER_EVENTS } from "#/pubsub";
import { computeNextOccurrence } from "#/services/recurrence";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, lte } from "drizzle-orm";

export const processPendingReminders = Workflow.name("calendar.reminder.process-pending").handler(
  async (_input: undefined, ctx) => {
    const pending = await ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(calendarReminder)
        .where(and(eq(calendarReminder.isSent, false), lte(calendarReminder.remindAt, new Date()))),
    );

    const now = new Date();

    await Promise.all(
      pending.map(async (row) => {
        await ctx.pubsub.publish(REMINDER_EVENTS.DUE, {
          remindAt: row.remindAt?.toISOString() ?? now.toISOString(),
          reminder: {
            channel: row.channel,
            id: row.id,
            isRecurring: row.isRecurring,
            message: row.message,
            targetId: row.targetId,
            targetType: row.targetType,
            type: row.type,
            userId: row.userId,
          },
        });

        await ctx.db
          .update(calendarReminder)
          .set({ isSent: true, sentAt: now })
          .where(eq(calendarReminder.id, row.id));

        if (row.isRecurring && row.interval && row.remindAt) {
          const nextDate = computeNextOccurrence(row.remindAt, row.interval);
          if (nextDate) {
            await ctx.db.insert(calendarReminder).values({
              channel: row.channel,
              createdBy: row.createdBy,
              interval: row.interval,
              isRecurring: true,
              message: row.message,
              offsetMinutes: row.offsetMinutes,
              remindAt: nextDate,
              targetId: row.targetId,
              targetType: row.targetType,
              type: row.type,
              userId: row.userId,
            });
          }
        }
      }),
    );

    return pending.length;
  },
);
