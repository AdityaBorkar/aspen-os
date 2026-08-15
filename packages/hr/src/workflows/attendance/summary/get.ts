import { attendance } from "#/db-schemas";
import type { AttendanceSummary } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  month: pipe(string(), minLength(1, "month is required")),
});

export const getSummary = Workflow.name("hr.attendance.get-summary")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId, month } = input;

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const records = await ctx.db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employeeId),
          sql`${attendance.date} >= ${startDate}`,
          sql`${attendance.date} <= ${endDate}`,
        ),
      );

    const summary: AttendanceSummary = {
      absent: 0,
      halfDay: 0,
      month,
      present: 0,
      totalDays: records.length,
      workFromHome: 0,
    };

    for (const record of records) {
      const status = record.status as string;
      switch (status) {
        case "present": {
          summary.present++;
          break;
        }
        case "absent": {
          summary.absent++;
          break;
        }
        case "half_day": {
          summary.halfDay++;
          break;
        }
        case "work_from_home": {
          summary.workFromHome++;
          break;
        }
      }
    }

    return summary;
  });
