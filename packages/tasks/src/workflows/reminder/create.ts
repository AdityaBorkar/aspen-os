import { reminder } from "#/db-schemas/reminder";
import { CreateReminderSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({
  input: CreateReminderSchema,
});

export const createReminder = Workflow.name("reminder.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(reminder)
      .values({
        interval: input.interval ?? null,
        isRecurring: input.isRecurring ?? false,
        message: input.message ?? null,
        remindAt: input.remindAt,
        taskId: input.taskId,
        type: input.type,
        userId: input.userId,
      })
      .returning();

    return result;
  });
