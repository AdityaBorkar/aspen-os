import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { reminder } from "../db-schemas/reminder";
import { IdSchema } from "../types";

export const fetchReminderStep = WorkflowStep.name("fetch-reminder")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db.select().from(reminder).where(eq(reminder.id, input.id)).limit(1);

    if (!result) {
      throw new Error(`Reminder with id "${input.id}" not found.`);
    }

    return result;
  });
