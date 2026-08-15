import { onboardingTask } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getOnboardingTaskById = Workflow.name("hr.lifecycle.get-onboarding-task-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(onboardingTask)
      .where(eq(onboardingTask.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Onboarding task with id "${id}" not found.`);
    }

    return result;
  });
