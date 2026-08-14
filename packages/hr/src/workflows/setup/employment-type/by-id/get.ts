import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employmentType } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getEmploymentTypeById = Workflow.name("hr.setup.get-employment-type-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employmentType)
      .where(eq(employmentType.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Employment type with id "${id}" not found.`);
    }

    return result;
  });
