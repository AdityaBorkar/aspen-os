import { taskType } from "#/db-schemas/task-type";
import { IdSchema } from "#/types";
import { requireRow } from "#/workflows/utils";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchTaskTypeStep = WorkflowStep.name("fetch-task-type")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const rows = await ctx.db.select().from(taskType).where(eq(taskType.id, input.id)).limit(1);

    return requireRow(rows, "Task type", input.id);
  });
