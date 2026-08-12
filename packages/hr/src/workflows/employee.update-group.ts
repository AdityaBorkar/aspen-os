import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { employeeGroup } from "../db-schemas";
import { UpdateEmployeeGroupSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateEmployeeGroupSchema,
});

export const updateGroup = Workflow.name("hr.employee.update-group")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateEmployeeGroupSchema, patch);

    const [updated] = await ctx.db
      .update(employeeGroup)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeGroup.id, id))
      .returning();

    return updated;
  });
