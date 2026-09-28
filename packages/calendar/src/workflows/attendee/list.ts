import { calendarAttendee, calendarEvent } from "#/db-schemas";
import { AttendeeFiltersSchema } from "#/types";
import { actorGroupIds, visibleEventCondition } from "#/workflow-steps/access-scope";
import { resolveActorId } from "#/workflow-steps/access-service";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const ListInputSchema = object({ filters: optional(AttendeeFiltersSchema) });

export const listAttendees = Workflow.name("calendar.attendee.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    const actorId = resolveActorId(ctx.actorId);
    const parsed = parse(AttendeeFiltersSchema, filters ?? {});
    const groupIds = await actorGroupIds(ctx.db, actorId);

    const visibleEvents = ctx.db
      .select({ id: calendarEvent.id })
      .from(calendarEvent)
      .where(visibleEventCondition(actorId, groupIds));

    const conditions = [inArray(calendarAttendee.event_id, visibleEvents)];

    if (parsed.eventId) {
      conditions.push(eq(calendarAttendee.event_id, parsed.eventId));
    }
    if (parsed.email) {
      conditions.push(eq(calendarAttendee.email, parsed.email));
    }
    if (parsed.status) {
      conditions.push(eq(calendarAttendee.status, parsed.status));
    }

    return ctx.db
      .select()
      .from(calendarAttendee)
      .where(and(...conditions))
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });
