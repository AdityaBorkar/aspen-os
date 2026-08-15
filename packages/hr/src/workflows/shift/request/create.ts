import { shiftRequest } from "#/db-schemas";
import { CreateShiftRequestSchema } from "#/types";
import { fetchShiftTypeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateShiftRequestSchema,
});

export const createShiftRequest = Workflow.name("hr.shift.create-shift-request")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShiftRequestSchema, input);

    // Verify shift type exists
    await fetchShiftTypeById(ctx.db, parsed.shiftType);

    const [result] = await ctx.db
      .insert(shiftRequest)
      .values({
        employeeId: parsed.employeeId,
        fromDate: parsed.fromDate,
        reason: parsed.reason ?? null,
        shiftType: parsed.shiftType,
        toDate: parsed.toDate ?? null,
      })
      .returning();

    return result;
  });
