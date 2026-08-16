import { assertCanAccessReminder } from "#/services/access-service";
import { WithIdSchema } from "#/types";
import { fetchReminderStep } from "#/workflow-steps/fetch-reminder";

import { Workflow } from "@aspen-os/platform/server";

export const getReminder = Workflow.name("calendar.reminder.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const found = await ctx.step.run(fetchReminderStep, { id });

    await assertCanAccessReminder(found, ctx.actorId, ctx.db);

    return found;
  });
