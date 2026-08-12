import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { taskType } from "../db-schemas/task-type";
import { CreateTaskTypeSchema } from "../types";
import { unsetDefaultTaskType } from "./utils";

const CreateInputSchema = object({
  input: CreateTaskTypeSchema,
});

export const createTaskType = Workflow.name("task-type.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.isDefault && input.projectId) {
      await unsetDefaultTaskType(ctx.db, input.projectId);
    }

    const [result] = await ctx.db
      .insert(taskType)
      .values({
        color: input.color ?? null,
        icon: input.icon ?? null,
        isDefault: input.isDefault ?? false,
        name: input.name,
        projectId: input.projectId ?? null,
      })
      .returning();

    return result;
  });
