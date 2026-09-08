import { CreateLabelSchema } from "#/types";

import { masterLabel } from "@aspen-os/masters";
import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({
  input: CreateLabelSchema,
});

export const createLabel = Workflow.name("task-type.create-label")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const scopeType = input.projectId ? "project" : null;
    const scopeId = input.projectId ?? null;

    const [result] = await ctx.db
      .insert(masterLabel)
      .values({
        color: input.color ?? null,
        name: input.name,
        scope_id: scopeId,
        scope_type: scopeType,
      })
      .returning();

    return result;
  });
