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
        .where(and(eq(calendarReminder.is_sent, false), lte(calendarReminder.remind_at, now)))
        .orderBy(asc(calendarReminder.remind_at))
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
          .set({ is_sent: true, sent_at: now })
          .where(and(eq(calendarReminder.id, row.id), eq(calendarReminder.is_sent, false)))
          .returning();
        if (!claimed) {
          return false;
        }

        try {
          await ctx.pubsub.publish(REMINDER_EVENTS.DUE, {
            remindAt: claimed.remind_at?.toISOString() ?? now.toISOString(),
            reminder: toReminderPayload(claimed),
          });
        } catch (error) {
          await ctx.db
            .update(calendarReminder)
            .set({ is_sent: false, sent_at: null })
            .where(eq(calendarReminder.id, claimed.id));
          throw error;
        }

        // The interval column is free text and can hold legacy values: decode
        // it at the boundary. Unknown values stay acknowledged-but-not
        // rescheduled so one poison row never stalls the batch.
        if (claimed.is_recurring && claimed.interval && claimed.remind_at) {
          const interval = safeParse(ReminderIntervalSchema, claimed.interval);
          if (interval.success) {
            await ctx.db.insert(calendarReminder).values({
              channel: claimed.channel,
              created_by: claimed.created_by,
              interval: interval.output,
              is_recurring: true,
              message: claimed.message,
              offset_minutes: claimed.offset_minutes,
              remind_at: computeNextOccurrence(claimed.remind_at, interval.output),
              target_id: claimed.target_id,
              target_type: claimed.target_type,
              type: claimed.type,
              user_id: claimed.user_id,
            });
          }
        }

        return true;
      }),
    );

    return results.filter((processed) => processed).length;
  },
);
