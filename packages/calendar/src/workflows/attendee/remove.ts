import { calendarAttendee } from "#/db-schemas";
import { ATTENDEE_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAttendeeStep } from "#/workflow-steps/fetch-attendee";
import { fetchEventCalendarStep } from "#/workflow-steps/fetch-event-calendar";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const removeAttendee = Workflow.name("calendar.attendee.remove")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const attendee = await ctx.step.run(fetchAttendeeStep, { id });
    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: attendee.eventId });

    await assertCanMutate(cal, ctx.actorId);

    await ctx.db.delete(calendarAttendee).where(eq(calendarAttendee.id, id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.REMOVED,
        crudAction: "delete",
        entityId: attendee.id,
        entityType: AUDIT_ENTITY_TYPE.ATTENDEE,
        previousState: { email: attendee.email },
      });

      await ctx.pubsub.publish(ATTENDEE_EVENTS.REMOVED, {
        attendeeId: attendee.id,
        calendarId: cal.id,
        eventId: attendee.eventId,
      });
    });

    return { removed: true };
  });
