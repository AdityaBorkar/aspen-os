import { shiftType } from "#/db-schemas";
import { CreateShiftTypeSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateShiftTypeSchema,
});

export const createShiftType = Workflow.name("hr.shift.create-shift-type")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(shiftType)
      .values({
        allow_check_out_after_end: parsed.allowCheckOutAfterEnd ?? 0,
        allow_overtime: parsed.allowOvertime ?? false,
        begin_check_in_before_start: parsed.beginCheckInBeforeStart ?? 0,
        determine_check_in_by: parsed.determineCheckInBy ?? null,
        early_exit_grace_minutes: parsed.earlyExitGraceMinutes ?? 0,
        enable_auto_attendance: parsed.enableAutoAttendance ?? false,
        enable_auto_update_sync: parsed.enableAutoUpdateSync ?? false,
        end_time: parsed.endTime,
        holiday_list: parsed.holidayList ?? null,
        late_entry_grace_minutes: parsed.lateEntryGraceMinutes ?? 0,
        mark_attendance_on_holidays: parsed.markAttendanceOnHolidays ?? false,
        name: parsed.name,
        overtime_type: parsed.overtimeType ?? null,
        process_attendance_after: parsed.processAttendanceAfter ?? null,
        start_time: parsed.startTime,
        working_hours_calculation: parsed.workingHoursCalculation ?? null,
        working_hours_threshold_for_absent: parsed.workingHoursThresholdForAbsent ?? null,
        working_hours_threshold_for_half_day: parsed.workingHoursThresholdForHalfDay ?? null,
      })
      .returning();

    return result;
  });
