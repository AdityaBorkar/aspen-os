import { onboardingTask } from "#/db-schemas";
import { CreateOnboardingTaskSchema } from "#/types";
import { fetchOnboardingById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateOnboardingTaskSchema,
});

export const createOnboardingTask = Workflow.name("hr.lifecycle.create-onboarding-task")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateOnboardingTaskSchema, input);

    // Verify onboarding exists
    await fetchOnboardingById(ctx.db, parsed.onboardingId);

    const [result] = await ctx.db
      .insert(onboardingTask)
      .values({
        assignedTo: parsed.assignedTo ?? null,
        department: parsed.department ?? null,
        description: parsed.description ?? null,
        dueDate: parsed.dueDate ?? null,
        notes: parsed.notes ?? null,
        onboardingId: parsed.onboardingId,
        title: parsed.title,
      })
      .returning();

    return result;
  });
