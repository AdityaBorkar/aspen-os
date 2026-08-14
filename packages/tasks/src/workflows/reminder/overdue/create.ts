import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { reminder } from "../../../db-schemas/reminder";
import { task } from "../../../db-schemas/task";
import { IdSchema } from "../../../types";

const OVERDUE_REMINDER_TYPE = "overdue";

export const createOverdueReminder = Workflow.name("reminder.create-overdue")
  .input(object({ taskId: IdSchema, userId: IdSchema }))
  .handler(async ({ taskId, userId }, ctx) => {
    const [taskRow] = await ctx.db
      .select({ dueDate: task.dueDate })
      .from(task)
      .where(eq(task.id, taskId))
      .limit(1);

    if (!taskRow?.dueDate) {
      return;
    }

    await ctx.db.insert(reminder).values({
      interval: "daily",
      isRecurring: true,
      remindAt: new Date(),
      taskId,
      type: OVERDUE_REMINDER_TYPE,
      userId,
    });
  });
