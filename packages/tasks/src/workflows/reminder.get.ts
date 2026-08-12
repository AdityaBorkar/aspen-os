import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchReminderStep } from "./steps/fetch-reminder";

export const getReminder = Workflow.name("reminder.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    return ctx.step.run(fetchReminderStep, { id });
  });
