import { shiftAssignment } from "#/db-schemas";
import { UpdateShiftAssignmentSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateShiftAssignmentSchema,
});

export const updateShiftAssignment = Workflow.name("hr.shift.update-shift-assignment")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = patch;

    const [updated] = await ctx.db
      .update(shiftAssignment)
      .set({ ...parsed, updated_at: new Date() })
      .where(eq(shiftAssignment.id, id))
      .returning();

    return updated;
  });
