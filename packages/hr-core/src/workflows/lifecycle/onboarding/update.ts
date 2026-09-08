import { employeeOnboarding } from "#/db-schemas";
import { UpdateOnboardingSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateOnboardingSchema,
});

export const updateOnboarding = Workflow.name("hr.lifecycle.update-onboarding")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = patch;

    const [updated] = await ctx.db
      .update(employeeOnboarding)
      .set({ ...parsed, updated_at: new Date() })
      .where(eq(employeeOnboarding.id, id))
      .returning();

    return updated;
  });
