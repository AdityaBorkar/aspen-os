import { calendar, calendarAttendee, calendarEvent, calendarReminder } from "#/db-schemas";
import { CALENDAR_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchCalendarStep } from "#/workflow-steps/fetch-calendar";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";

export const deleteCalendar = Workflow.name("calendar.calendar.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await ctx.step.run(fetchCalendarStep, { id });

    await assertCanMutate(existing, ctx.actorId);

    const rows = await ctx.db
      .select({ id: calendarEvent.id })
      .from(calendarEvent)
      .where(eq(calendarEvent.calendarId, id));

    const eventIds = rows.map((row) => row.id);

    if (eventIds.length > 0) {
      await ctx.db
        .delete(calendarReminder)
        .where(
          and(
            eq(calendarReminder.targetType, "event"),
            inArray(calendarReminder.targetId, eventIds),
          ),
        );
      await ctx.db.delete(calendarAttendee).where(inArray(calendarAttendee.eventId, eventIds));
    }

    await ctx.db.delete(calendarEvent).where(eq(calendarEvent.calendarId, id));
    await ctx.db.delete(calendar).where(eq(calendar.id, id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: existing.id,
        entityType: AUDIT_ENTITY_TYPE.CALENDAR,
        previousState: { name: existing.name },
      });

      await ctx.pubsub.publish(CALENDAR_EVENTS.DELETED, {
        calendarId: existing.id,
      });
    });

    return { removed: true };
  });
