import { reminder } from "#/db-schemas/reminder";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, lte } from "drizzle-orm";

export const getPendingReminders = Workflow.name("reminder.get-pending").handler(
  async (_input: undefined, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(reminder)
        .where(and(eq(reminder.isSent, false), lte(reminder.remindAt, new Date()))),
    ),
);
