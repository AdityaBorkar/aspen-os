import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeOnboarding, onboardingTask } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteOnboarding = Workflow.name("hr.lifecycle.delete-onboarding")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    // Delete tasks first
    await ctx.db
      .delete(onboardingTask)
      .where(eq(onboardingTask.onboardingId, id));

    const [deleted] = await ctx.db
      .delete(employeeOnboarding)
      .where(eq(employeeOnboarding.id, id))
      .returning();

    return deleted;
  });
