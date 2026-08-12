import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { onboardingTask } from "../db-schemas";
import { UpdateOnboardingTaskSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateOnboardingTaskSchema,
});

export const updateOnboardingTask = Workflow.name(
  "hr.lifecycle.update-onboarding-task",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateOnboardingTaskSchema, patch);

    const updateData: Record<string, unknown> = {
      ...parsed,
      updatedAt: new Date(),
    };
    if (parsed.status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await ctx.db
      .update(onboardingTask)
      .set(updateData)
      .where(eq(onboardingTask.id, id))
      .returning();

    return updated;
  });
