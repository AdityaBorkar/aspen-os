import { shiftScheduleAssignment } from "#/db-schemas";
import { CreateShiftScheduleAssignmentSchema } from "#/types";
import { fetchShiftScheduleById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateShiftScheduleAssignmentSchema,
});

export const createShiftScheduleAssignment = Workflow.name(
  "hr.shift.create-shift-schedule-assignment",
)
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Verify shift schedule exists
    await fetchShiftScheduleById(ctx.db, parsed.shiftSchedule);

    const [result] = await ctx.db
      .insert(shiftScheduleAssignment)
      .values({
        employee_id: parsed.employeeId,
        end_date: parsed.endDate ?? null,
        is_active: parsed.isActive ?? true,
        shift_schedule: parsed.shiftSchedule,
        start_date: parsed.startDate,
      })
      .returning();

    return result;
  });
