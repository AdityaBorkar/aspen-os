import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeOnboarding } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getOnboardingById = Workflow.name(
  "hr.lifecycle.get-onboarding-by-id",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employeeOnboarding)
      .where(eq(employeeOnboarding.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Onboarding with id "${id}" not found.`);
    }

    return result;
  });
