import { employeeOnboarding } from "#/db-schemas";
import { TRANSITION_EVENTS } from "#/pubsub";
import { assertUpdated, fetchOnboardingById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const completeOnboarding = Workflow.name("hr.transition.complete-onboarding")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const onboarding = await fetchOnboardingById(ctx.db, id);
    requireStatus(onboarding, ["in_progress", "pending"], `Onboarding "${id}"`);

    const updated = await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .update(employeeOnboarding)
        .set({
          completed_at: new Date(),
          status: "completed",
          updated_at: new Date(),
        })
        .where(eq(employeeOnboarding.id, id))
        .returning();

      return assertUpdated(row, `Onboarding "${id}"`);
    });

    await ctx.pubsub.publish(TRANSITION_EVENTS.ONBOARDING_COMPLETED, {
      employeeId: onboarding.employee_id,
      onboardingId: id,
    });

    return updated;
  });
