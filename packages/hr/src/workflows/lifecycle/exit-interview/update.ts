import { exitInterview } from "#/db-schemas";
import { UpdateExitInterviewSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateExitInterviewSchema,
});

export const updateExitInterview = Workflow.name("hr.lifecycle.update-exit-interview")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateExitInterviewSchema, patch);

    const updateData: Record<string, unknown> = {
      ...parsed,
      updatedAt: new Date(),
    };
    if (parsed.scheduledDate) {
      updateData.scheduledDate = new Date(parsed.scheduledDate);
    }
    if (parsed.completedDate) {
      updateData.completedDate = new Date(parsed.completedDate);
    }

    const [updated] = await ctx.db
      .update(exitInterview)
      .set(updateData)
      .where(eq(exitInterview.id, id))
      .returning();

    return updated;
  });
