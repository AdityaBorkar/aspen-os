import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { label } from "../../../db-schemas/label";
import { CreateLabelSchema } from "../../../types";

const CreateInputSchema = object({
  input: CreateLabelSchema,
});

export const createLabel = Workflow.name("task-type.create-label")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(label)
      .values({
        color: input.color ?? null,
        name: input.name,
        projectId: input.projectId ?? null,
      })
      .returning();

    return result;
  });
