import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { taskType } from "../../db-schemas/task-type";
import { IdSchema } from "../../types";

export const fetchTaskTypeStep = WorkflowStep.name("fetch-task-type")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db.select().from(taskType).where(eq(taskType.id, input.id)).limit(1);

    if (!result) {
      throw new Error(`Task type with id "${input.id}" not found.`);
    }

    return result;
  });
