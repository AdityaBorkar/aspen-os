import { calendarEvent, calendarReminder } from "#/db-schemas";
import { EVENT_EVENTS } from "#/pubsub";
import { assertCanAccess, assertCanMutate } from "#/services/access-service";
import { validateEventWindow, validateSourceLink } from "#/services/event-service";
import { IdSchema, UpdateEventSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchCalendarStep } from "#/workflow-steps/fetch-calendar";
import { fetchEventStep } from "#/workflow-steps/fetch-event";
import { fetchEventCalendarStep } from "#/workflow-steps/fetch-event-calendar";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateEventSchema });

export const updateEvent = Workflow.name("calendar.event.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateEventSchema, input);

    const existing = await ctx.step.run(fetchEventStep, { id });

    let { calendarId } = existing;
    let cal = await ctx.step.run(fetchEventCalendarStep, { eventId: existing.id });
    await assertCanMutate(cal, ctx.actorId);

    const nextCalendarId = parsed.calendarId;
    if (nextCalendarId && nextCalendarId !== existing.calendarId) {
      calendarId = nextCalendarId;
      cal = await ctx.step.run(fetchCalendarStep, { id: calendarId });
      assertCanAccess(cal, ctx.actorId);
      await assertCanMutate(cal, ctx.actorId);
    }

    const nextStartsAt = parsed.startsAt ?? existing.startsAt;
    const nextEndsAt = parsed.endsAt !== undefined ? parsed.endsAt : existing.endsAt;
    const nextAllDay = parsed.allDay ?? existing.allDay;

    validateEventWindow({ allDay: nextAllDay, endsAt: nextEndsAt, startsAt: nextStartsAt });

    const nextSourceType =
      parsed.sourceType !== undefined ? parsed.sourceType : existing.sourceType;
    const nextSourceEntityId =
      parsed.sourceEntityId !== undefined ? parsed.sourceEntityId : existing.sourceEntityId;
    validateSourceLink(nextSourceType, nextSourceEntityId);

    const updates = stripUndefined({
      allDay: parsed.allDay,
      calendarId: parsed.calendarId,
      color: parsed.color,
      description: parsed.description,
      endsAt: parsed.endsAt,
      location: parsed.location,
      recurrence: parsed.recurrence,
      sourceEntityId: parsed.sourceEntityId,
      sourceType: parsed.sourceType,
      startsAt: parsed.startsAt,
      status: parsed.status,
      timezone: parsed.timezone,
      title: parsed.title,
    });

    const [updated] = await ctx.db
      .update(calendarEvent)
      .set({ ...updates })
      .where(eq(calendarEvent.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Event with id "${id}" not found.`);
    }

    if (parsed.startsAt && parsed.startsAt.getTime() !== existing.startsAt.getTime()) {
      const offsetReminders = await ctx.db
        .select()
        .from(calendarReminder)
        .where(
          and(
            eq(calendarReminder.targetType, "event"),
            eq(calendarReminder.targetId, existing.id),
            eq(calendarReminder.type, "offset"),
          ),
        );

      await Promise.all(
        offsetReminders.map(async (reminder) => {
          if (reminder.offsetMinutes === null) {
            return;
          }
          await ctx.db
            .update(calendarReminder)
            .set({ remindAt: new Date(nextStartsAt.getTime() - reminder.offsetMinutes * 60_000) })
            .where(eq(calendarReminder.id, reminder.id));
        }),
      );
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: parsed,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.EVENT,
        newState: {
          calendarId: updated.calendarId,
          startsAt: updated.startsAt,
          title: updated.title,
        },
        previousState: {
          calendarId: existing.calendarId,
          startsAt: existing.startsAt,
          title: existing.title,
        },
      });

      await ctx.pubsub.publish(EVENT_EVENTS.UPDATED, {
        calendarId: updated.calendarId,
        event: {
          calendarId: updated.calendarId,
          endsAt: updated.endsAt?.toISOString() ?? null,
          id: updated.id,
          startsAt: updated.startsAt.toISOString(),
          title: updated.title,
        },
        sourceEntityId: updated.sourceEntityId,
        sourceType: updated.sourceType,
      });
    });

    return updated;
  });
