import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftAssignment } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getShiftAssignmentById = Workflow.name(
  "hr.shift.get-shift-assignment-by-id",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(shiftAssignment)
      .where(eq(shiftAssignment.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift assignment with id "${id}" not found.`);
    }

    return result;
  });
