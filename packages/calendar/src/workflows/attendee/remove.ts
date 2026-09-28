import { calendarAttendee } from "#/db-schemas";
import { ATTENDEE_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertCanMutateEvent } from "#/workflow-steps/access-service";
import { fetchAttendeeStep, fetchEventStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const removeAttendee = Workflow.name("calendar.attendee.remove")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const attendee = await ctx.step.run(fetchAttendeeStep, { id });
    const event = await ctx.step.run(fetchEventStep, { id: attendee.event_id });

    await assertCanMutateEvent(event, ctx.actorId, ctx.db);

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
        eventId: attendee.event_id,
      });
    });

    return { removed: true };
  });
