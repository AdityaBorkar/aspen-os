import { exitInterview } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, record, string, unknown } from "valibot";

const InputSchema = object({
  feedback: pipe(string(), minLength(1, "feedback is required")),
  id: pipe(string(), minLength(1, "id is required")),
  responses: record(string(), unknown()),
});

export const completeExitInterview = Workflow.name("hr.lifecycle.complete-exit-interview")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, feedback, responses } = input;

    const [updated] = await ctx.db
      .update(exitInterview)
      .set({
        completedDate: new Date(),
        feedback,
        responses,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(exitInterview.id, id))
      .returning();

    return updated;
  });
