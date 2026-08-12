import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { shiftScheduleAssignment } from "../db-schemas";
import { CreateShiftScheduleAssignmentSchema } from "../types";
import { fetchShiftScheduleById } from "./utils";

const InputSchema = object({
  input: CreateShiftScheduleAssignmentSchema,
});

export const createShiftScheduleAssignment = Workflow.name(
  "hr.shift.create-shift-schedule-assignment",
)
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShiftScheduleAssignmentSchema, input);

    // Verify shift schedule exists
    await fetchShiftScheduleById(ctx.db, parsed.shiftSchedule);

    const [result] = await ctx.db
      .insert(shiftScheduleAssignment)
      .values({
        employeeId: parsed.employeeId,
        endDate: parsed.endDate ?? null,
        isActive: parsed.isActive ?? true,
        shiftSchedule: parsed.shiftSchedule,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  });
