import { WithIdSchema } from "#/types";
import { assertCanAccessEvent } from "#/workflow-steps/access-service";
import { fetchAttendeeStep, fetchEventStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";

export const getAttendee = Workflow.name("calendar.attendee.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const attendee = await ctx.step.run(fetchAttendeeStep, { id });
    const event = await ctx.step.run(fetchEventStep, { id: attendee.event_id });

    await assertCanAccessEvent(event, ctx.actorId, ctx.db);

    return attendee;
  });
