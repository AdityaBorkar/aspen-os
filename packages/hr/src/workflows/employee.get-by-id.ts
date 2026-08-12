import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employee } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getById = Workflow.name("hr.employee.get-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employee)
      .where(eq(employee.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Employee with id "${id}" not found.`);
    }

    return result;
  });
