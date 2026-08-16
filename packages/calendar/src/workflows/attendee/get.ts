import { assertCanAccess } from "#/services/access-service";
import { WithIdSchema } from "#/types";
import { fetchAttendeeStep } from "#/workflow-steps/fetch-attendee";
import { fetchEventCalendarStep } from "#/workflow-steps/fetch-event-calendar";

import { Workflow } from "@aspen-os/platform/server";

export const getAttendee = Workflow.name("calendar.attendee.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const attendee = await ctx.step.run(fetchAttendeeStep, { id });
    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: attendee.eventId });

    assertCanAccess(cal, ctx.actorId);

    return attendee;
  });
