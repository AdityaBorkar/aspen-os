import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

import { reminder } from "../db-schemas/reminder";
import { ReminderFiltersSchema } from "../types";

export const listReminders = Workflow.name("reminder.list")
  .input(object({ filters: optional(ReminderFiltersSchema) }))
  .handler(async ({ filters }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions = [];

      if (filters?.taskId) conditions.push(eq(reminder.taskId, filters.taskId));
      if (filters?.userId) conditions.push(eq(reminder.userId, filters.userId));
      if (filters?.type) conditions.push(eq(reminder.type, filters.type));
      if (filters?.isSent !== undefined) {
        conditions.push(eq(reminder.isSent, filters.isSent));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(reminder).where(whereClause);
    }),
  );
