import { taskType } from "#/db-schemas/task-type";
import { IdSchema, UpdateTaskTypeSchema } from "#/types";
import { fetchTaskTypeStep } from "#/workflow-steps/fetch-task-type";
import { unsetDefaultTaskType } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateTaskTypeSchema,
});

export const updateTaskType = Workflow.name("task-type.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const current = await ctx.step.run(fetchTaskTypeStep, { id });

    if (patch.isDefault && current.project_id) {
      await unsetDefaultTaskType(ctx.db, current.project_id);
    }

    const [updated] = await ctx.db
      .update(taskType)
      .set({
        color: patch.color,
        icon: patch.icon,
        is_default: patch.isDefault,
        name: patch.name,
      })
      .where(eq(taskType.id, id))
      .returning();

    return updated;
  });
