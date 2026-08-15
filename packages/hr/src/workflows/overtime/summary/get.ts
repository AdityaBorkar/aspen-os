import { overtimeSlip } from "#/db-schemas";
import type { OvertimeSummary } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  fromDate: pipe(string(), minLength(1, "fromDate is required")),
  toDate: pipe(string(), minLength(1, "toDate is required")),
});

export const getOvertimeSummary = Workflow.name("hr.overtime.get-overtime-summary")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId, fromDate, toDate } = input;

    const slips = await ctx.db
      .select()
      .from(overtimeSlip)
      .where(
        and(
          eq(overtimeSlip.employeeId, employeeId),
          eq(overtimeSlip.status, "approved"),
          sql`${overtimeSlip.fromDate} >= ${fromDate}`,
          sql`${overtimeSlip.toDate} <= ${toDate}`,
        ),
      );

    const summary: OvertimeSummary = {
      holidayHours: 0,
      standardHours: 0,
      totalHours: 0,
      weekendHours: 0,
    };

    for (const slip of slips) {
      summary.standardHours += parseFloat(slip.standardHours);
      summary.holidayHours += parseFloat(slip.holidayHours);
      summary.weekendHours += parseFloat(slip.weekendHours);
      summary.totalHours += parseFloat(slip.totalOvertimeHours);
    }

    return summary;
  });
