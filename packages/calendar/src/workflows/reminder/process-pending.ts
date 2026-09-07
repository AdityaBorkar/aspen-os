import { calendarReminder } from "#/db-schemas";
import { REMINDER_EVENTS } from "#/pubsub";
import { ReminderIntervalSchema } from "#/types";
import { toReminderPayload } from "#/workflow-steps/payloads";
import { computeNextOccurrence } from "#/workflow-steps/recurrence";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, lte } from "drizzle-orm";
import { safeParse } from "valibot";

const BATCH_LIMIT = 100;

export const processPendingReminders = Workflow.name("calendar.reminder.process-pending").handler(
  async (_input: undefined, ctx) => {
    const now = new Date();

    const pending = await ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(calendarReminder)
        .where(and(eq(calendarReminder.isSent, false), lte(calendarReminder.remindAt, now)))
        .orderBy(asc(calendarReminder.remindAt))
        .limit(BATCH_LIMIT),
    );

    const results = await Promise.all(
      pending.map(async (row) => {
        // Claim first: concurrent scans skip already-claimed rows instead of
        // double-delivering. On publish failure the claim is released so a
        // later scan retries (at-least-once; only a hard crash between claim
        // and publish can lose a firing — same as any non-outbox design).
        const [claimed] = await ctx.db
          .update(calendarReminder)
          .set({ isSent: true, sentAt: now })
          .where(and(eq(calendarReminder.id, row.id), eq(calendarReminder.isSent, false)))
          .returning();
        if (!claimed) {
          return false;
        }

        try {
          await ctx.pubsub.publish(REMINDER_EVENTS.DUE, {
            remindAt: claimed.remindAt?.toISOString() ?? now.toISOString(),
            reminder: toReminderPayload(claimed),
          });
        } catch (error) {
          await ctx.db
            .update(calendarReminder)
            .set({ isSent: false, sentAt: null })
            .where(eq(calendarReminder.id, claimed.id));
          throw error;
        }

        // The interval column is free text and can hold legacy values: decode
        // it at the boundary. Unknown values stay acknowledged-but-not
        // rescheduled so one poison row never stalls the batch.
        if (claimed.isRecurring && claimed.interval && claimed.remindAt) {
          const interval = safeParse(ReminderIntervalSchema, claimed.interval);
          if (interval.success) {
            await ctx.db.insert(calendarReminder).values({
              channel: claimed.channel,
              createdBy: claimed.createdBy,
              interval: interval.output,
              isRecurring: true,
              message: claimed.message,
              offsetMinutes: claimed.offsetMinutes,
              remindAt: computeNextOccurrence(claimed.remindAt, interval.output),
              targetId: claimed.targetId,
              targetType: claimed.targetType,
              type: claimed.type,
              userId: claimed.userId,
            });
          }
        }

        return true;
      }),
    );

    return results.filter((processed) => processed).length;
  },
);
