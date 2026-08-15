import { employee } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deactivate = Workflow.name("hr.employee.deactivate")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(employee)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(employee.id, id))
      .returning();

    return updated;
  });
