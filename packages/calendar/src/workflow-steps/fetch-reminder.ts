import { calendarReminder } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const fetchReminderStep = WorkflowStep.name("calendar-fetch-reminder")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(calendarReminder)
      .where(eq(calendarReminder.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Reminder with id "${input.id}" not found.`);
    }
    return row;
  });
