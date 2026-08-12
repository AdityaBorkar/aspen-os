import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { onboardingTask } from "../db-schemas";

const InputSchema = object({
  completedBy: pipe(string(), minLength(1, "completedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const completeOnboardingTask = Workflow.name(
  "hr.lifecycle.complete-onboarding-task",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, completedBy } = input;

    const [updated] = await ctx.db
      .update(onboardingTask)
      .set({
        completedAt: new Date(),
        completedBy,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(onboardingTask.id, id))
      .returning();

    return updated;
  });
