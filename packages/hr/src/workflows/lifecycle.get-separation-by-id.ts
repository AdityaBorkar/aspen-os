import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeSeparation } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getSeparationById = Workflow.name("hr.lifecycle.get-separation-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employeeSeparation)
      .where(eq(employeeSeparation.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Separation with id "${id}" not found.`);
    }

    return result;
  });
