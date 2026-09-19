import { employeeOnboarding } from "#/db-schemas";
import { TRANSITION_EVENTS } from "#/pubsub";
import { UpdateOnboardingSchema } from "#/types";
import { assertUpdated, fetchOnboardingById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateOnboardingSchema,
});

export const updateOnboarding = Workflow.name("hr.transition.update-onboarding")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = patch;
    const existing = await fetchOnboardingById(ctx.db, id);

    const [updated] = await ctx.db
      .update(employeeOnboarding)
      .set({ ...parsed, updated_at: new Date() })
      .where(eq(employeeOnboarding.id, id))
      .returning();

    const transitionedToCompleted =
      parsed.status === "completed" && existing.status !== "completed";

    if (transitionedToCompleted) {
      await ctx.pubsub.publish(TRANSITION_EVENTS.ONBOARDING_COMPLETED, {
        employeeId: existing.employee_id,
        onboardingId: id,
      });
    }

    return assertUpdated(updated, `Onboarding "${id}"`);
  });
