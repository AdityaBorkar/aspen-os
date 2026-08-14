import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { shiftScheduleAssignment } from "../../../db-schemas";
import { UpdateShiftScheduleAssignmentSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateShiftScheduleAssignmentSchema,
});

export const updateShiftScheduleAssignment = Workflow.name(
  "hr.shift.update-shift-schedule-assignment",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateShiftScheduleAssignmentSchema, patch);

    const [updated] = await ctx.db
      .update(shiftScheduleAssignment)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftScheduleAssignment.id, id))
      .returning();

    return updated;
  });
