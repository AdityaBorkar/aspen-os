import { exitInterview } from "#/db-schemas";
import { UpdateExitInterviewSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateExitInterviewSchema,
});

export const updateExitInterview = Workflow.name("hr.lifecycle.update-exit-interview")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = patch;

    const { completedDate, scheduledDate, ...rest } = parsed;

    const updateData: Partial<typeof exitInterview.$inferInsert> = {
      ...rest,
      updated_at: new Date(),
    };
    if (scheduledDate) {
      updateData.scheduled_date = new Date(scheduledDate);
    }
    if (completedDate) {
      updateData.completed_date = new Date(completedDate);
    }

    const [updated] = await ctx.db
      .update(exitInterview)
      .set(updateData)
      .where(eq(exitInterview.id, id))
      .returning();

    return updated;
  });
