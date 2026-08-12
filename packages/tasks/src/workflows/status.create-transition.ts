import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { statusTransition } from "../db-schemas/status-transition";
import { CreateStatusTransitionSchema } from "../types";

const CreateInputSchema = object({
  input: CreateStatusTransitionSchema,
});

export const createTransition = Workflow.name("status.create-transition")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.fromStatusId === input.toStatusId) {
      throw new Error("From and to status cannot be the same.");
    }

    const [result] = await ctx.db
      .insert(statusTransition)
      .values({
        fromStatusId: input.fromStatusId,
        projectId: input.projectId,
        requiresComment: input.requiresComment ?? false,
        requiresRole: input.requiresRole ?? null,
        toStatusId: input.toStatusId,
      })
      .returning();

    return result;
  });
