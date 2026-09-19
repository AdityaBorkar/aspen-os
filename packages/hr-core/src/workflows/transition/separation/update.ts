import { employeeSeparation } from "#/db-schemas";
import { UpdateSeparationSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateSeparationSchema,
});

export const updateSeparation = Workflow.name("hr.transition.update-separation")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = patch;

    const [updated] = await ctx.db
      .update(employeeSeparation)
      .set({ ...parsed, updated_at: new Date() })
      .where(eq(employeeSeparation.id, id))
      .returning();

    return updated;
  });
