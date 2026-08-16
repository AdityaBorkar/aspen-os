import { calendarAttendee, calendarEvent, calendarReminder } from "#/db-schemas";
import { EVENT_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEventStep } from "#/workflow-steps/fetch-event";
import { fetchEventCalendarStep } from "#/workflow-steps/fetch-event-calendar";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const deleteEvent = Workflow.name("calendar.event.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const event = await ctx.step.run(fetchEventStep, { id });
    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: event.id });

    await assertCanMutate(cal, ctx.actorId);

    await ctx.db
      .delete(calendarReminder)
      .where(
        and(eq(calendarReminder.targetType, "event"), eq(calendarReminder.targetId, event.id)),
      );
    await ctx.db.delete(calendarAttendee).where(eq(calendarAttendee.eventId, event.id));
    await ctx.db.delete(calendarEvent).where(eq(calendarEvent.id, event.id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: event.id,
        entityType: AUDIT_ENTITY_TYPE.EVENT,
        previousState: { title: event.title },
      });

      await ctx.pubsub.publish(EVENT_EVENTS.DELETED, {
        calendarId: event.calendarId,
        eventId: event.id,
      });
    });

    return { removed: true };
  });
