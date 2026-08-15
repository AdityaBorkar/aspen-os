import { shiftType } from "#/db-schemas";
import { CreateShiftTypeSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateShiftTypeSchema,
});

export const createShiftType = Workflow.name("hr.shift.create-shift-type")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShiftTypeSchema, input);

    const [result] = await ctx.db
      .insert(shiftType)
      .values({
        allowCheckOutAfterEnd: parsed.allowCheckOutAfterEnd ?? 0,
        allowOvertime: parsed.allowOvertime ?? false,
        beginCheckInBeforeStart: parsed.beginCheckInBeforeStart ?? 0,
        determineCheckInBy: parsed.determineCheckInBy ?? null,
        earlyExitGraceMinutes: parsed.earlyExitGraceMinutes ?? 0,
        enableAutoAttendance: parsed.enableAutoAttendance ?? false,
        enableAutoUpdateSync: parsed.enableAutoUpdateSync ?? false,
        endTime: parsed.endTime,
        holidayList: parsed.holidayList ?? null,
        lateEntryGraceMinutes: parsed.lateEntryGraceMinutes ?? 0,
        markAttendanceOnHolidays: parsed.markAttendanceOnHolidays ?? false,
        name: parsed.name,
        overtimeType: parsed.overtimeType ?? null,
        processAttendanceAfter: parsed.processAttendanceAfter ?? null,
        startTime: parsed.startTime,
        workingHoursCalculation: parsed.workingHoursCalculation ?? null,
        workingHoursThresholdForAbsent: parsed.workingHoursThresholdForAbsent ?? null,
        workingHoursThresholdForHalfDay: parsed.workingHoursThresholdForHalfDay ?? null,
      })
      .returning();

    return result;
  });
