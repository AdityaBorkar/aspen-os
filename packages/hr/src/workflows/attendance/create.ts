import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { attendance } from "../../db-schemas";
import { CreateAttendanceSchema } from "../../types";
import { ensureNoDuplicateAttendance } from "../utils";

const InputSchema = object({
  input: CreateAttendanceSchema,
});

export const create = Workflow.name("hr.attendance.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAttendanceSchema, input);

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
        attendanceRequest: parsed.attendanceRequest ?? null,
        checkInTime: parsed.checkInTime ? new Date(parsed.checkInTime) : null,
        checkOutTime: parsed.checkOutTime ? new Date(parsed.checkOutTime) : null,
        date: parsed.date,
        earlyExit: parsed.earlyExit ?? false,
        earlyExitMinutes: parsed.earlyExitMinutes ?? 0,
        employeeId: parsed.employeeId,
        halfDayType: parsed.halfDayType ?? null,
        isHalfDay: parsed.isHalfDay ?? false,
        lateEntry: parsed.lateEntry ?? false,
        lateEntryMinutes: parsed.lateEntryMinutes ?? 0,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        shift: parsed.shift ?? null,
        status: parsed.status,
        workingHours: parsed.workingHours ?? null,
      })
      .returning();

    return result;
  });
