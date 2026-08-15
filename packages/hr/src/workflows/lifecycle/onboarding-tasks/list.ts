import { onboardingTask } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  onboardingId: pipe(string(), minLength(1, "onboardingId is required")),
});

export const listOnboardingTasks = Workflow.name("hr.lifecycle.list-onboarding-tasks")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { onboardingId } = input;

    return ctx.db
      .select()
      .from(onboardingTask)
      .where(eq(onboardingTask.onboardingId, onboardingId));
  });
