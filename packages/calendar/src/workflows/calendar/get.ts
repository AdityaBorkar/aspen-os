import { WithIdSchema } from "#/types";
import { assertCanAccess } from "#/workflow-steps/access-service";
import { fetchCalendarStep } from "#/workflow-steps/fetch-calendar";

import { Workflow } from "@aspen-os/platform/server";

export const getCalendar = Workflow.name("calendar.calendar.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const found = await ctx.step.run(fetchCalendarStep, { id });

    assertCanAccess(found, ctx.actorId);

    return found;
  });
