import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { taskType } from "../db-schemas/task-type";
import { IdSchema, UpdateTaskTypeSchema } from "../types";
import { fetchTaskTypeStep } from "./steps/fetch-task-type";
import { unsetDefaultTaskType } from "./utils";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateTaskTypeSchema,
});

export const updateTaskType = Workflow.name("task-type.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    await ctx.step.run(fetchTaskTypeStep, { id });

    if (patch.isDefault) {
      const [current] = await ctx.db
        .select({ projectId: taskType.projectId })
        .from(taskType)
        .where(eq(taskType.id, id))
        .limit(1);
      if (current?.projectId) {
        await unsetDefaultTaskType(ctx.db, current.projectId);
      }
    }

    const [updated] = await ctx.db
      .update(taskType)
      .set({
        color: patch.color,
        icon: patch.icon,
        isDefault: patch.isDefault,
        name: patch.name,
      })
      .where(eq(taskType.id, id))
      .returning();

    return updated;
  });
