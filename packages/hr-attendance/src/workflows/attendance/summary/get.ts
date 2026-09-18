import { attendance } from "#/db-schemas";
import type { AttendanceSummary } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  month: pipe(string(), minLength(1, "month is required")),
});

export const getAttendanceSummary = Workflow.name("hr.attendance.summary.get")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId, month } = input;

    const startDate = `${month}-01`;
    // Last calendar day of the month (YYYY-MM input). The previous `${month}-31`
    // literal produced invalid dates such as 2026-09-31, which Postgres
    // rejects with 22008 on DATE columns.
    const [year, monthIdx] = month.split("-").map(Number);
    const lastDay = new Date(year ?? 1970, monthIdx ?? 1, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

    const records = await ctx.db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employee_id, employeeId),
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
      // SAFETY: `attendance.status` is an enum column whose stored value is always one of
      // The string statuses handled by the switch below.
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
