import { employeeOnboarding } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteOnboarding = Workflow.name("hr.transition.delete-onboarding")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(employeeOnboarding)
      .where(eq(employeeOnboarding.id, id))
      .returning();

    return deleted;
  });
