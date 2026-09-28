import { calendarEvent } from "#/db-schemas";
import { EVENT_EVENTS } from "#/pubsub";
import { IdSchema, UpdateEventSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, CALENDAR_AUDIENCE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { assertCanMutateEvent } from "#/workflow-steps/access-service";
import {
  rescheduleOffsetReminders,
  validateEventWindow,
  validateSourceLink,
} from "#/workflow-steps/event-service";
import { fetchEventStep } from "#/workflow-steps/fetch";
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

    await assertCanMutateEvent(existing, ctx.actorId, ctx.db);

    const nextStartsAt = parsed.startsAt ?? existing.starts_at;
    const nextEndsAt = parsed.endsAt !== undefined ? parsed.endsAt : existing.ends_at;
    const nextAllDay = parsed.allDay ?? existing.all_day;

    validateEventWindow({ allDay: nextAllDay, endsAt: nextEndsAt, startsAt: nextStartsAt });

    const nextSourceType =
      parsed.sourceType !== undefined ? parsed.sourceType : existing.source_type;
    const nextSourceEntityId =
      parsed.sourceEntityId !== undefined ? parsed.sourceEntityId : existing.source_entity_id;
    validateSourceLink(nextSourceType, nextSourceEntityId);

    const nextAudienceType = parsed.audienceType ?? existing.audience_type;
    const nextAudienceId =
      parsed.audienceId !== undefined ? parsed.audienceId : existing.audience_id;
    if (
      nextAudienceType !== CALENDAR_AUDIENCE.ORGANIZATION &&
      (nextAudienceId === null || nextAudienceId === "")
    ) {
      throw new Error("audienceId is required for group or user audiences");
    }

    const updates = {
      ...stripUndefined({
        allDay: parsed.allDay,
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
      }),
      audience_id: nextAudienceType === CALENDAR_AUDIENCE.ORGANIZATION ? null : nextAudienceId,
      audience_type: nextAudienceType,
    };

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
          audienceType: updated.audience_type,
          startsAt: updated.starts_at,
          title: updated.title,
        },
        previousState: {
          audienceType: existing.audience_type,
          startsAt: existing.starts_at,
          title: existing.title,
        },
      });

      await ctx.pubsub.publish(EVENT_EVENTS.UPDATED, {
        event: toEventPayload(updated),
        sourceEntityId: updated.source_entity_id,
        sourceType: updated.source_type,
      });
    });

    return updated;
  });
