import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftAssignment } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteShiftAssignment = Workflow.name("hr.shift.delete-shift-assignment")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(shiftAssignment)
      .where(eq(shiftAssignment.id, id))
      .returning();

    return deleted;
  });
