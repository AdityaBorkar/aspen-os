import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftScheduleAssignment } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteShiftScheduleAssignment = Workflow.name(
  "hr.shift.delete-shift-schedule-assignment",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(shiftScheduleAssignment)
      .where(eq(shiftScheduleAssignment.id, id))
      .returning();

    return deleted;
  });
