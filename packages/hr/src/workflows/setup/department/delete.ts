import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { department } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteDepartment = Workflow.name("hr.setup.delete-department")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(department)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(department.id, id))
      .returning();

    return updated;
  });
