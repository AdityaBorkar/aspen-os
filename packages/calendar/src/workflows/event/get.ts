import { WithIdSchema } from "#/types";
import { assertCanAccessEvent } from "#/workflow-steps/access-service";
import { fetchEventStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";

export const getEvent = Workflow.name("calendar.event.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const event = await ctx.step.run(fetchEventStep, { id });

    await assertCanAccessEvent(event, ctx.actorId, ctx.db);

    return event;
  });
