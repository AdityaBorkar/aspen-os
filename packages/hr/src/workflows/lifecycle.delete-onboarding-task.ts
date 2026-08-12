import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { onboardingTask } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteOnboardingTask = Workflow.name(
  "hr.lifecycle.delete-onboarding-task",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(onboardingTask)
      .where(eq(onboardingTask.id, id))
      .returning();

    return deleted;
  });
