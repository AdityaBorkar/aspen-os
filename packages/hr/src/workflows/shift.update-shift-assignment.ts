import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { shiftAssignment } from "../db-schemas";
import { UpdateShiftAssignmentSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateShiftAssignmentSchema,
});

export const updateShiftAssignment = Workflow.name(
  "hr.shift.update-shift-assignment",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateShiftAssignmentSchema, patch);

    const [updated] = await ctx.db
      .update(shiftAssignment)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftAssignment.id, id))
      .returning();

    return updated;
  });
