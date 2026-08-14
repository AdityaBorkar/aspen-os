import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { overtimeSlip } from "../../../db-schemas";
import { CreateOvertimeSlipSchema } from "../../../types";
import { fetchOvertimeTypeById } from "../../utils";

const InputSchema = object({
  input: CreateOvertimeSlipSchema,
});

export const createOvertimeSlip = Workflow.name("hr.overtime.create-overtime-slip")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateOvertimeSlipSchema, input);

    // Verify overtime type exists
    await fetchOvertimeTypeById(ctx.db, parsed.overtimeType);

    const [result] = await ctx.db
      .insert(overtimeSlip)
      .values({
        employeeId: parsed.employeeId,
        fromDate: parsed.fromDate,
        holidayHours: parsed.holidayHours ?? "0",
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        overtimeType: parsed.overtimeType,
        standardHours: parsed.standardHours ?? "0",
        toDate: parsed.toDate,
        totalOvertimeHours: parsed.totalOvertimeHours,
        weekendHours: parsed.weekendHours ?? "0",
      })
      .returning();

    return result;
  });
