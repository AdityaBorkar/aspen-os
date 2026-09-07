import { calendarAttendee, calendarEvent, calendarReminder } from "#/db-schemas";
import { EVENT_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, REMINDER_TARGET } from "#/utils/constants";
import { assertCanMutate } from "#/workflow-steps/access-service";
import { fetchEventCalendarStep, fetchEventStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const deleteEvent = Workflow.name("calendar.event.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const event = await ctx.step.run(fetchEventStep, { id });
    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: event.id });

    await assertCanMutate(cal, ctx.actorId, ctx.db);

    await ctx.db.transaction(async (tx) => {
      await tx
        .delete(calendarReminder)
        .where(
          and(
            eq(calendarReminder.targetType, REMINDER_TARGET.EVENT),
            eq(calendarReminder.targetId, event.id),
          ),
        );
      await tx.delete(calendarAttendee).where(eq(calendarAttendee.eventId, event.id));
      await tx.delete(calendarEvent).where(eq(calendarEvent.id, event.id));
    });

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
