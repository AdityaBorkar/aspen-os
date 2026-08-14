import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { employeeSeparation } from "../../../db-schemas";
import { UpdateSeparationSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateSeparationSchema,
});

export const updateSeparation = Workflow.name("hr.lifecycle.update-separation")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateSeparationSchema, patch);

    const [updated] = await ctx.db
      .update(employeeSeparation)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeSeparation.id, id))
      .returning();

    return updated;
  });
