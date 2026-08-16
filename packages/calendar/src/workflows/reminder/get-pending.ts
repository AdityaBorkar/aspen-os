import { calendarReminder } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, lte } from "drizzle-orm";

export const getPendingReminders = Workflow.name("calendar.reminder.get-pending").handler(
  async (_input: undefined, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(calendarReminder)
        .where(and(eq(calendarReminder.isSent, false), lte(calendarReminder.remindAt, new Date()))),
    ),
);
