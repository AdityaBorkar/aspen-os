import { calendarEvent } from "#/db-schemas";
import { EVENT_EVENTS } from "#/pubsub";
import { IdSchema, UpdateEventSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { assertCanMutate } from "#/workflow-steps/access-service";
import {
  rescheduleOffsetReminders,
  validateEventWindow,
  validateSourceLink,
} from "#/workflow-steps/event-service";
import { fetchCalendarStep, fetchEventCalendarStep, fetchEventStep } from "#/workflow-steps/fetch";
import { toEventPayload } from "#/workflow-steps/payloads";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateEventSchema });

export const updateEvent = Workflow.name("calendar.event.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateEventSchema, input);

    const existing = await ctx.step.run(fetchEventStep, { id });

    let cal = await ctx.step.run(fetchEventCalendarStep, { eventId: existing.id });
    await assertCanMutate(cal, ctx.actorId, ctx.db);

    const nextCalendarId = parsed.calendarId;
    if (nextCalendarId && nextCalendarId !== existing.calendar_id) {
      cal = await ctx.step.run(fetchCalendarStep, { id: nextCalendarId });
      await assertCanMutate(cal, ctx.actorId, ctx.db);
    }

    const nextStartsAt = parsed.startsAt ?? existing.starts_at;
    const nextEndsAt = parsed.endsAt !== undefined ? parsed.endsAt : existing.ends_at;
    const nextAllDay = parsed.allDay ?? existing.all_day;

    validateEventWindow({ allDay: nextAllDay, endsAt: nextEndsAt, startsAt: nextStartsAt });

    const nextSourceType =
      parsed.sourceType !== undefined ? parsed.sourceType : existing.source_type;
    const nextSourceEntityId =
      parsed.sourceEntityId !== undefined ? parsed.sourceEntityId : existing.source_entity_id;
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
      .set(updates)
      .where(eq(calendarEvent.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Event with id "${id}" not found.`);
    }

    if (parsed.startsAt && parsed.startsAt.getTime() !== existing.starts_at.getTime()) {
      await rescheduleOffsetReminders(ctx.db, existing.id, nextStartsAt);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: parsed,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.EVENT,
        newState: {
          calendarId: updated.calendar_id,
          startsAt: updated.starts_at,
          title: updated.title,
        },
        previousState: {
          calendarId: existing.calendar_id,
          startsAt: existing.starts_at,
          title: existing.title,
        },
      });

      await ctx.pubsub.publish(EVENT_EVENTS.UPDATED, {
        calendarId: updated.calendar_id,
        event: toEventPayload(updated),
        sourceEntityId: updated.source_entity_id,
        sourceType: updated.source_type,
      });
    });

    return updated;
  });
