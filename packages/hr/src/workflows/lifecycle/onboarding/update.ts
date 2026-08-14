import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { employeeOnboarding } from "../../../db-schemas";
import { UpdateOnboardingSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateOnboardingSchema,
});

export const updateOnboarding = Workflow.name("hr.lifecycle.update-onboarding")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateOnboardingSchema, patch);

    const [updated] = await ctx.db
      .update(employeeOnboarding)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeOnboarding.id, id))
      .returning();

    return updated;
  });
