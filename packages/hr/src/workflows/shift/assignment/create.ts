import { shiftAssignment } from "#/db-schemas";
import { CreateShiftAssignmentSchema } from "#/types";
import { fetchShiftTypeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateShiftAssignmentSchema,
});

export const createShiftAssignment = Workflow.name("hr.shift.create-shift-assignment")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShiftAssignmentSchema, input);

    // Verify shift type exists
    await fetchShiftTypeById(ctx.db, parsed.shiftType);

    const [result] = await ctx.db
      .insert(shiftAssignment)
      .values({
        employeeId: parsed.employeeId,
        endDate: parsed.endDate ?? null,
        notes: parsed.notes ?? null,
        shiftLocation: parsed.shiftLocation ?? null,
        shiftType: parsed.shiftType,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  });
