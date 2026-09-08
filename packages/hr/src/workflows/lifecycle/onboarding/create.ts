import { employeeOnboarding } from "#/db-schemas";
import { CreateOnboardingSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateOnboardingSchema,
});

export const createOnboarding = Workflow.name("hr.lifecycle.create-onboarding")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(employeeOnboarding)
      .values({
        employee_id: parsed.employeeId,
        expected_completion_date: parsed.expectedCompletionDate ?? null,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        start_date: parsed.startDate,
      })
      .returning();

    return result;
  });
