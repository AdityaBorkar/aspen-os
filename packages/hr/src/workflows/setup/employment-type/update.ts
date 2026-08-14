import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { employmentType } from "../../../db-schemas";
import { UpdateEmploymentTypeSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateEmploymentTypeSchema,
});

export const updateEmploymentType = Workflow.name("hr.setup.update-employment-type")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateEmploymentTypeSchema, patch);

    const [updated] = await ctx.db
      .update(employmentType)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employmentType.id, id))
      .returning();

    return updated;
  });
