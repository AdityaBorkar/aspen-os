import { attendance } from "#/db-schemas";
import { CreateAttendanceSchema } from "#/types";
import { ensureNoDuplicateAttendance } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateAttendanceSchema,
});

export const create = Workflow.name("hr.attendance.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Check for future dates
    const attendanceDate = new Date(parsed.date);
    if (attendanceDate > new Date()) {
      throw new Error("Cannot mark attendance for future dates.");
    }

    // Check for duplicate attendance
    await ensureNoDuplicateAttendance(ctx.db, parsed.employeeId, parsed.date);

    const [result] = await ctx.db
      .insert(attendance)
      .values({
        attendance_request: parsed.attendanceRequest ?? null,
        check_in_time: parsed.checkInTime ? new Date(parsed.checkInTime) : null,
        check_out_time: parsed.checkOutTime ? new Date(parsed.checkOutTime) : null,
        date: parsed.date,
        early_exit: parsed.earlyExit ?? false,
        early_exit_minutes: parsed.earlyExitMinutes ?? 0,
        employee_id: parsed.employeeId,
        half_day_type: parsed.halfDayType ?? null,
        is_half_day: parsed.isHalfDay ?? false,
        late_entry: parsed.lateEntry ?? false,
        late_entry_minutes: parsed.lateEntryMinutes ?? 0,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        shift: parsed.shift ?? null,
        status: parsed.status,
        working_hours: parsed.workingHours ?? null,
      })
      .returning();

    return result;
  });
