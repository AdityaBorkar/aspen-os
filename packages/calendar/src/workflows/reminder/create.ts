import { calendarEvent, calendarReminder } from "#/db-schemas";
import { REMINDER_EVENTS } from "#/pubsub";
import { CreateReminderSchema, TARGETS_REQUIRING_ID } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, REMINDER_TARGET, REMINDER_TYPE } from "#/utils/constants";
import { resolveActorId } from "#/workflow-steps/access-service";
import { toReminderPayload } from "#/workflow-steps/payloads";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateReminderSchema });

export const createReminder = Workflow.name("calendar.reminder.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateReminderSchema, input);
    const actorId = resolveActorId(ctx.actorId);

    if (TARGETS_REQUIRING_ID.has(parsed.targetType) && !parsed.targetId) {
      throw new Error(`targetId is required for targetType "${parsed.targetType}"`);
    }

    let remindAt: Date | null | undefined = parsed.remindAt;
    if (parsed.type === REMINDER_TYPE.OFFSET) {
      if (
        parsed.targetType === REMINDER_TARGET.EVENT &&
        parsed.targetId &&
        remindAt === undefined
      ) {
        const [event] = await ctx.db
          .select({ startsAt: calendarEvent.starts_at })
          .from(calendarEvent)
          .where(eq(calendarEvent.id, parsed.targetId))
          .limit(1);

        if (!event) {
          throw new Error(`Event with id "${parsed.targetId}" not found.`);
        }

        remindAt = new Date(event.startsAt.getTime() - parsed.offsetMinutes * 60_000);
      }
      if (remindAt === undefined) {
        throw new Error(
          "remindAt is required for offset reminders with no resolvable target anchor",
        );
      }
    }

    const [created] = await ctx.db
      .insert(calendarReminder)
      .values({
        channel: parsed.channel,
        created_by: actorId,
        interval: parsed.interval ?? null,
        is_recurring: parsed.isRecurring ?? false,
        message: parsed.message ?? null,
        offset_minutes: parsed.offsetMinutes ?? null,
        remind_at: remindAt ?? null,
        target_id: parsed.targetId ?? "",
        target_type: parsed.targetType,
        type: parsed.type,
        user_id: parsed.userId,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create reminder.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.REMINDER,
        newState: {
          remind_at: created.remind_at,
          target_id: created.target_id,
          type: created.type,
        },
      });

      await ctx.pubsub.publish(REMINDER_EVENTS.CREATED, {
        reminder: toReminderPayload(created),
      });
    });

    return created;
  });
