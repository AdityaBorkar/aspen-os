import { healthcareAttendance, healthcareLeaveRequest, healthcareStaff } from "#/db-schemas/staff";
import { ExportPayrollSchema } from "#/schemas/staff";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PayrollExportInputSchema = object({ input: ExportPayrollSchema });

export const payrollExport = Workflow.name("healthcare.staff.payroll-export")
  .input(PayrollExportInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ExportPayrollSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [staff, attendance, leaves] = await ctx.step.run("load-payroll", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareStaff)
          .where(and(eq(healthcareStaff.branch_id, branchId), eq(healthcareStaff.status, "active")))
          .limit(1000),
        ctx.db
          .select()
          .from(healthcareAttendance)
          .where(eq(healthcareAttendance.branch_id, branchId))
          .limit(2000),
        ctx.db
          .select()
          .from(healthcareLeaveRequest)
          .where(
            and(
              eq(healthcareLeaveRequest.branch_id, branchId),
              eq(healthcareLeaveRequest.status, "approved"),
            ),
          )
          .limit(1000),
      ]),
    );
    const monthRows = attendance.filter((row) => row.date.startsWith(parsed.month));
    return {
      hook: "payrollExport",
      leaves: leaves.map((row) => ({
        from: row.from_date,
        id: row.id,
        staffId: row.staff_id,
        to: row.to_date,
      })),
      month: parsed.month,
      note: "Attendance hook only — salary computation happens in the payroll system",
      present: monthRows.filter((row) => row.status === "present" || row.status === "half").length,
      staff: staff.length,
    };
  });
