import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftScheduleAssignment } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getShiftScheduleAssignmentById = Workflow.name(
  "hr.shift.get-shift-schedule-assignment-by-id",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(shiftScheduleAssignment)
      .where(eq(shiftScheduleAssignment.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift schedule assignment with id "${id}" not found.`);
    }

    return result;
  });
