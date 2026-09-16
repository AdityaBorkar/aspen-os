import { CreateShiftAssignmentSchema } from "#/types";
import { insertShiftAssignment } from "#/workflows/shift-records";
import { fetchShiftType } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateShiftAssignmentSchema,
});

export const createShiftAssignment = Workflow.name("hr.shift.assignment.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    await fetchShiftType(ctx.db, input.shiftType);

    return insertShiftAssignment(ctx.db, {
      employeeId: input.employeeId,
      endDate: input.endDate ?? undefined,
      notes: input.notes ?? undefined,
      shiftLocation: input.shiftLocation ?? undefined,
      shiftType: input.shiftType,
      startDate: input.startDate,
    });
  });
