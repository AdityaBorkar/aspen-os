import { assertCanAccess } from "#/services/access-service";
import { WithIdSchema } from "#/types";
import { fetchEventStep } from "#/workflow-steps/fetch-event";
import { fetchEventCalendarStep } from "#/workflow-steps/fetch-event-calendar";

import { Workflow } from "@aspen-os/platform/server";

export const getEvent = Workflow.name("calendar.event.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const event = await ctx.step.run(fetchEventStep, { id });
    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: event.id });

    assertCanAccess(cal, ctx.actorId);

    return event;
  });
