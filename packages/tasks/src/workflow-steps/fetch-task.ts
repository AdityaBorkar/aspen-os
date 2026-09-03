import { task } from "#/db-schemas/task";
import { IdSchema } from "#/types";
import { requireRow } from "#/workflows/utils";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchTaskStep = WorkflowStep.name("fetch-task")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const rows = await ctx.db.select().from(task).where(eq(task.id, input.id)).limit(1);

    return requireRow(rows, "Task", input.id);
  });
