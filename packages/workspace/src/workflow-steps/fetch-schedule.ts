import { workspaceSchedule } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchScheduleStep = WorkflowStep.name("workspace-fetch-schedule")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [schedule] = await ctx.db
      .select()
      .from(workspaceSchedule)
      .where(eq(workspaceSchedule.id, input.id))
      .limit(1);

    if (!schedule) {
      throw new Error(`Schedule with id "${input.id}" not found.`);
    }
    return schedule;
  });
