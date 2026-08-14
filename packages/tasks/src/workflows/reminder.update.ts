import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { reminder } from "../db-schemas/reminder";
import { IdSchema, UpdateReminderSchema } from "../types";
import { fetchReminderStep } from "../workflow-steps/fetch-reminder";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateReminderSchema,
});

export const updateReminder = Workflow.name("reminder.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    await ctx.step.run(fetchReminderStep, { id });

    const [updated] = await ctx.db
      .update(reminder)
      .set({
        interval: patch.interval,
        isRecurring: patch.isRecurring,
        isSent: patch.isSent,
        message: patch.message,
        remindAt: patch.remindAt,
      })
      .where(eq(reminder.id, id))
      .returning();

    return updated;
  });
