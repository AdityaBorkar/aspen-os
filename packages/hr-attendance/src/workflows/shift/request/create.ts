import { shiftRequest } from "#/db-schemas";
import { CreateShiftRequestSchema } from "#/types";
import { fetchShiftTypeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateShiftRequestSchema,
});

export const createShiftRequest = Workflow.name("hr.shift.create-shift-request")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Verify shift type exists
    await fetchShiftTypeById(ctx.db, parsed.shiftType);

    const [result] = await ctx.db
      .insert(shiftRequest)
      .values({
        employee_id: parsed.employeeId,
        from_date: parsed.fromDate,
        reason: parsed.reason ?? null,
        shift_type: parsed.shiftType,
        to_date: parsed.toDate ?? null,
      })
      .returning();

    return result;
  });
