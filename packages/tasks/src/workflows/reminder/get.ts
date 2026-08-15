import { IdSchema } from "#/types";
import { fetchReminderStep } from "#/workflow-steps/fetch-reminder";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getReminder = Workflow.name("reminder.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => ctx.step.run(fetchReminderStep, { id }));
