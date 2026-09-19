import { employeeOnboarding } from "#/db-schemas";
import { TRANSITION_EVENTS } from "#/pubsub";
import { CreateOnboardingSchema } from "#/types";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateOnboardingSchema,
});

export const createOnboarding = Workflow.name("hr.transition.create-onboarding")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(employeeOnboarding)
      .values({
        employee_id: parsed.employeeId,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
      })
      .returning();

    const created = assertUpdated(result, `Onboarding for employee "${parsed.employeeId}"`);

    await ctx.pubsub.publish(TRANSITION_EVENTS.ONBOARDING_STARTED, {
      onboarding: {
        employeeId: parsed.employeeId,
        id: created.id,
      },
    });

    return created;
  });
