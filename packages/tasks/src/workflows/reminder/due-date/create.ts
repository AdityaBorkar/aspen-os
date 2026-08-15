import { reminder } from "#/db-schemas/reminder";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { date, object } from "valibot";

const DUE_DATE_REMINDER_TYPE = "due_date";

export const createDueDateReminders = Workflow.name("reminder.create-due-date")
  .input(object({ dueDate: date(), taskId: IdSchema, userId: IdSchema }))
  .handler(async ({ taskId, dueDate, userId }, ctx) => {
    const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    const oneHourBefore = new Date(dueDate.getTime() - 60 * 60 * 1000);

    await ctx.db.insert(reminder).values([
      {
        interval: null,
        isRecurring: false,
        remindAt: oneDayBefore,
        taskId,
        type: DUE_DATE_REMINDER_TYPE,
        userId,
      },
      {
        interval: null,
        isRecurring: false,
        remindAt: oneHourBefore,
        taskId,
        type: DUE_DATE_REMINDER_TYPE,
        userId,
      },
      {
        interval: null,
        isRecurring: false,
        remindAt: dueDate,
        taskId,
        type: DUE_DATE_REMINDER_TYPE,
        userId,
      },
    ]);
  });
