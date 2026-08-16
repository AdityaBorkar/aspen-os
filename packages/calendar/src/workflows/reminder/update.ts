import { calendarReminder } from "#/db-schemas";
import { REMINDER_EVENTS } from "#/pubsub";
import { assertCanAccessReminder } from "#/services/access-service";
import { IdSchema, UpdateReminderSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchReminderStep } from "#/workflow-steps/fetch-reminder";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateReminderSchema });

export const updateReminder = Workflow.name("calendar.reminder.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateReminderSchema, input);

    const existing = await ctx.step.run(fetchReminderStep, { id });

    await assertCanAccessReminder(existing, ctx.actorId, ctx.db);

    const updates = stripUndefined({
      channel: parsed.channel,
      interval: parsed.interval,
      isRecurring: parsed.isRecurring,
      message: parsed.message,
      offsetMinutes: parsed.offsetMinutes,
      remindAt: parsed.remindAt,
    });

    const [updated] = await ctx.db
      .update(calendarReminder)
      .set({ ...updates })
      .where(eq(calendarReminder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Reminder with id "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: parsed,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.REMINDER,
        newState: { remindAt: updated.remindAt, type: updated.type },
        previousState: { remindAt: existing.remindAt, type: existing.type },
      });

      await ctx.pubsub.publish(REMINDER_EVENTS.UPDATED, {
        changes: parsed,
        reminder: {
          channel: updated.channel,
          id: updated.id,
          isRecurring: updated.isRecurring,
          message: updated.message,
          targetId: updated.targetId,
          targetType: updated.targetType,
          type: updated.type,
          userId: updated.userId,
        },
      });
    });

    return updated;
  });
