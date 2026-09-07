import { WithIdSchema } from "#/types";
import { assertCanAccess } from "#/workflow-steps/access-service";
import { fetchAttendeeStep, fetchEventCalendarStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";

export const getAttendee = Workflow.name("calendar.attendee.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const attendee = await ctx.step.run(fetchAttendeeStep, { id });
    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: attendee.eventId });

    assertCanAccess(cal, ctx.actorId);

    return attendee;
  });
