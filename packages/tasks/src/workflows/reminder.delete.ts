import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { reminder } from "../db-schemas/reminder";
import { IdSchema } from "../types";

export const deleteReminder = Workflow.name("reminder.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(reminder).where(eq(reminder.id, id));
  });
