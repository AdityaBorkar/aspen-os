import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeGroup } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getGroupById = Workflow.name("hr.employee.get-group-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employeeGroup)
      .where(eq(employeeGroup.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Employee group with id "${id}" not found.`);
    }

    return result;
  });
