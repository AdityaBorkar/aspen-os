import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { employeeOnboarding } from "../db-schemas";
import { CreateOnboardingSchema } from "../types";

const InputSchema = object({
  input: CreateOnboardingSchema,
});

export const createOnboarding = Workflow.name("hr.lifecycle.create-onboarding")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateOnboardingSchema, input);

    const [result] = await ctx.db
      .insert(employeeOnboarding)
      .values({
        employeeId: parsed.employeeId,
        expectedCompletionDate: parsed.expectedCompletionDate ?? null,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  });
