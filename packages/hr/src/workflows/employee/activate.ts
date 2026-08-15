import { employee } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const activate = Workflow.name("hr.employee.activate")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(employee)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(employee.id, id))
      .returning();

    return updated;
  });
