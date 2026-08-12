import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { designation } from "../db-schemas";
import { UpdateDesignationSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateDesignationSchema,
});

export const updateDesignation = Workflow.name("hr.setup.update-designation")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateDesignationSchema, patch);

    const [updated] = await ctx.db
      .update(designation)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(designation.id, id))
      .returning();

    return updated;
  });
