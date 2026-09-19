import { employee } from "#/db-schemas";
import { ExportPayrollSchema } from "#/types";
import type { Db } from "#/workflows/db";
import { fetchPayrollSettings } from "#/workflows/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { boolean, nullish, object, safeParse, string } from "valibot";
import type { InferOutput } from "valibot";

const InputSchema = object({
  input: ExportPayrollSchema,
});

const MONTH_PATTERN = /^(?<year>\d{4})-(?<month>0[1-9]|1[0-2])$/;

const DAY_MS = 86_400_000;

const AttendanceRowSchema = object({
  date: string(),
  employeeId: string(),
  status: string(),
});

const OvertimeRowSchema = object({
  amount: nullish(string()),
  employeeId: string(),
  fromDate: string(),
  holidayHours: string(),
  standardHours: string(),
  toDate: string(),
  totalHours: string(),
  weekendHours: string(),
});

const LeaveRowSchema = object({
  employeeId: string(),
  fromDate: string(),
  isHalfDay: boolean(),
  leaveType: string(),
  toDate: string(),
});

const EncashmentRowSchema = object({
  amount: nullish(string()),
  employeeId: string(),
  encashedDays: string(),
  leaveType: string(),
  status: string(),
});

type AttendanceRow = InferOutput<typeof AttendanceRowSchema>;
type OvertimeRow = InferOutput<typeof OvertimeRowSchema>;
type LeaveRow = InferOutput<typeof LeaveRowSchema>;
type EncashmentRow = InferOutput<typeof EncashmentRowSchema>;

function toDayNumber(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

function overlapDays(from: string, to: string, range: { end: string; start: string }): number {
  const overlapStart = Math.max(toDayNumber(from), toDayNumber(range.start));
  const overlapEnd = Math.min(toDayNumber(to), toDayNumber(range.end));
  if (!Number.isFinite(overlapStart) || !Number.isFinite(overlapEnd) || overlapEnd < overlapStart) {
    return 0;
  }
  return Math.round((overlapEnd - overlapStart) / DAY_MS) + 1;
}

function toFloat(value: string | null | undefined): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthRange(month: string) {
  const year = Number.parseInt(month.slice(0, 4), 10);
  const monthIndex = Number.parseInt(month.slice(5, 7), 10);
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const day = String(lastDay).padStart(2, "0");
  return { end: `${month}-${day}`, start: `${month}-01` };
}

// NOTE: attendance, overtime, and leave tables are owned by
// @aspen-os/hr-attendance and @aspen-os/hr-leave. Their drizzle tables cannot
// be imported here: those are raw-src packages whose declarations reference
// the package-local `#/*` alias, which would resolve to this package's own
// sources. Query the tables directly so hr-core stays dependency-free; a
// missing table degrades to empty rows with a note instead of failing.
async function readAttendance(
  db: Db,
  start: string,
  end: string,
): Promise<{ notes: string[]; rows: AttendanceRow[] }> {
  try {
    const raw = await db.execute(
      sql`SELECT employee_id AS "employeeId", date::text AS "date", status::text AS "status" FROM attendance WHERE date >= ${start} AND date <= ${end} LIMIT 20000`,
    );
    const rows: AttendanceRow[] = [];
    let skipped = 0;
    for (const row of raw) {
      const decoded = safeParse(AttendanceRowSchema, row);
      if (decoded.success) {
        rows.push(decoded.output);
      } else {
        skipped++;
      }
    }
    const notes = skipped > 0 ? [`${skipped} attendance rows skipped (unexpected shape).`] : [];
    return { notes, rows };
  } catch {
    return { notes: ["attendance unavailable (table missing or unreadable)."], rows: [] };
  }
}

async function readOvertime(
  db: Db,
  start: string,
  end: string,
): Promise<{ notes: string[]; rows: OvertimeRow[] }> {
  try {
    const raw = await db.execute(
      sql`SELECT employee_id AS "employeeId", standard_hours::text AS "standardHours", weekend_hours::text AS "weekendHours", holiday_hours::text AS "holidayHours", total_overtime_hours::text AS "totalHours", amount::text AS "amount", from_date::text AS "fromDate", to_date::text AS "toDate" FROM overtime_slip WHERE status = 'approved' AND from_date <= ${end} AND to_date >= ${start} LIMIT 10000`,
    );
    const rows: OvertimeRow[] = [];
    let skipped = 0;
    for (const row of raw) {
      const decoded = safeParse(OvertimeRowSchema, row);
      if (decoded.success) {
        rows.push(decoded.output);
      } else {
        skipped++;
      }
    }
    const notes = skipped > 0 ? [`${skipped} overtime rows skipped (unexpected shape).`] : [];
    return { notes, rows };
  } catch {
    return { notes: ["overtime unavailable (table missing or unreadable)."], rows: [] };
  }
}

async function readLeaves(
  db: Db,
  start: string,
  end: string,
): Promise<{ notes: string[]; rows: LeaveRow[] }> {
  try {
    const raw = await db.execute(
      sql`SELECT employee_id AS "employeeId", leave_type AS "leaveType", from_date::text AS "fromDate", to_date::text AS "toDate", is_half_day AS "isHalfDay" FROM leave_application WHERE status = 'approved' AND from_date <= ${end} AND to_date >= ${start} LIMIT 10000`,
    );
    const rows: LeaveRow[] = [];
    let skipped = 0;
    for (const row of raw) {
      const decoded = safeParse(LeaveRowSchema, row);
      if (decoded.success) {
        rows.push(decoded.output);
      } else {
        skipped++;
      }
    }
    const notes = skipped > 0 ? [`${skipped} leave rows skipped (unexpected shape).`] : [];
    return { notes, rows };
  } catch {
    return { notes: ["leave applications unavailable (table missing or unreadable)."], rows: [] };
  }
}

async function readEncashments(db: Db): Promise<{ notes: string[]; rows: EncashmentRow[] }> {
  try {
    const raw = await db.execute(
      sql`SELECT employee_id AS "employeeId", leave_type AS "leaveType", encashed_days::text AS "encashedDays", amount::text AS "amount", status::text AS "status" FROM leave_encashment WHERE status IN ('approved', 'paid') LIMIT 10000`,
    );
    const rows: EncashmentRow[] = [];
    let skipped = 0;
    for (const row of raw) {
      const decoded = safeParse(EncashmentRowSchema, row);
      if (decoded.success) {
        rows.push(decoded.output);
      } else {
        skipped++;
      }
    }
    const notes = skipped > 0 ? [`${skipped} encashment rows skipped (unexpected shape).`] : [];
    return { notes, rows };
  } catch {
    return { notes: ["leave encashments unavailable (table missing or unreadable)."], rows: [] };
  }
}

interface MutableRow {
  absent: number;
  approvedLeaveDays: number;
  encashmentAmount: number;
  encashmentDays: number;
  halfDay: number;
  leavesByType: Map<string, number>;
  onLeave: number;
  overtimeAmount: number;
  overtimeHoliday: number;
  overtimeStandard: number;
  overtimeTotal: number;
  overtimeWeekend: number;
  present: number;
  workFromHome: number;
}

function emptyRow(): MutableRow {
  return {
    absent: 0,
    approvedLeaveDays: 0,
    encashmentAmount: 0,
    encashmentDays: 0,
    halfDay: 0,
    leavesByType: new Map(),
    onLeave: 0,
    overtimeAmount: 0,
    overtimeHoliday: 0,
    overtimeStandard: 0,
    overtimeTotal: 0,
    overtimeWeekend: 0,
    present: 0,
    workFromHome: 0,
  };
}

export const exportPayroll = Workflow.name("hr.payroll.export")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;
    if (!MONTH_PATTERN.test(parsed.month)) {
      throw new Error(`Month "${parsed.month}" must use YYYY-MM format.`);
    }
    const { end: monthEnd, start: monthStart } = monthRange(parsed.month);

    const conditions = [];
    if (parsed.company) {
      conditions.push(eq(employee.company, parsed.company));
    }
    if (parsed.branch) {
      conditions.push(eq(employee.branch, parsed.branch));
    }
    if (parsed.department) {
      conditions.push(eq(employee.department, parsed.department));
    }
    if (parsed.employeeId) {
      conditions.push(eq(employee.id, parsed.employeeId));
    }
    const employees = await ctx.db
      .select()
      .from(employee)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(2000);

    const byId = new Map(employees.map((row) => [row.id, row]));
    const byCode = new Map(employees.map((row) => [row.employee_id, row]));
    const resolveEmployee = (key: string) => byId.get(key) ?? byCode.get(key) ?? null;

    const [attendance, overtime, leaves, encashments, payrollSettings] = await Promise.all([
      readAttendance(ctx.db, monthStart, monthEnd),
      readOvertime(ctx.db, monthStart, monthEnd),
      readLeaves(ctx.db, monthStart, monthEnd),
      readEncashments(ctx.db),
      fetchPayrollSettings(ctx.db),
    ]);

    const aggregates = new Map<string, MutableRow>();
    const aggregateFor = (key: string): MutableRow => {
      const existing = aggregates.get(key);
      if (existing) {
        return existing;
      }
      const created = emptyRow();
      aggregates.set(key, created);
      return created;
    };

    let unmatchedAttendance = 0;
    for (const row of attendance.rows) {
      const target = resolveEmployee(row.employeeId);
      if (!target) {
        unmatchedAttendance++;
        continue;
      }
      const aggregate = aggregateFor(target.id);
      // SAFETY: attendance.status is the hr_attendance_status enum; unknown
      // values are ignored so new statuses cannot inflate payable days.
      const { status } = row;
      switch (status) {
        case "present": {
          aggregate.present++;
          break;
        }
        case "absent": {
          aggregate.absent++;
          break;
        }
        case "half_day": {
          aggregate.halfDay++;
          break;
        }
        case "work_from_home": {
          aggregate.workFromHome++;
          break;
        }
        case "on_leave": {
          aggregate.onLeave++;
          break;
        }
      }
    }

    for (const row of leaves.rows) {
      const target = resolveEmployee(row.employeeId);
      if (!target) {
        continue;
      }
      const days = row.isHalfDay
        ? 0.5
        : overlapDays(row.fromDate, row.toDate, { end: monthEnd, start: monthStart });
      if (days <= 0) {
        continue;
      }
      const aggregate = aggregateFor(target.id);
      aggregate.approvedLeaveDays += days;
      aggregate.leavesByType.set(
        row.leaveType,
        (aggregate.leavesByType.get(row.leaveType) ?? 0) + days,
      );
    }

    for (const row of overtime.rows) {
      const target = resolveEmployee(row.employeeId);
      if (!target) {
        continue;
      }
      const span = overlapDays(row.fromDate, row.toDate, { end: monthEnd, start: monthStart });
      const slipSpan = overlapDays(row.fromDate, row.toDate, {
        end: row.toDate,
        start: row.fromDate,
      });
      const fraction = slipSpan > 0 ? span / slipSpan : 0;
      if (fraction <= 0) {
        continue;
      }
      const aggregate = aggregateFor(target.id);
      aggregate.overtimeStandard += toFloat(row.standardHours) * fraction;
      aggregate.overtimeWeekend += toFloat(row.weekendHours) * fraction;
      aggregate.overtimeHoliday += toFloat(row.holidayHours) * fraction;
      aggregate.overtimeTotal += toFloat(row.totalHours) * fraction;
      aggregate.overtimeAmount += toFloat(row.amount) * fraction;
    }

    for (const row of encashments.rows) {
      const target = resolveEmployee(row.employeeId);
      if (!target) {
        continue;
      }
      const aggregate = aggregateFor(target.id);
      aggregate.encashmentDays += toFloat(row.encashedDays);
      aggregate.encashmentAmount += toFloat(row.amount);
    }

    const round = (value: number): number => {
      const rounding = payrollSettings?.rounding ?? "2";
      const places = Number.parseInt(rounding, 10);
      const decimals = Number.isFinite(places) ? Math.max(0, Math.min(4, places)) : 2;
      const factor = 10 ** decimals;
      return Math.round(value * factor) / factor;
    };

    const employeesOut = employees.map((row) => {
      const aggregate = aggregates.get(row.id) ?? emptyRow();
      // Payable days count time worked plus approved time off; loss-of-pay
      // days count absence plus the unpaid half of half days.
      const payableDays = round(
        aggregate.present +
          aggregate.workFromHome +
          aggregate.halfDay * 0.5 +
          aggregate.onLeave +
          aggregate.approvedLeaveDays,
      );
      const lopDays = round(aggregate.absent + aggregate.halfDay * 0.5);
      return {
        approvedLeaveDays: round(aggregate.approvedLeaveDays),
        attendance: {
          absent: aggregate.absent,
          halfDay: aggregate.halfDay,
          onLeave: aggregate.onLeave,
          present: aggregate.present,
          total:
            aggregate.present +
            aggregate.absent +
            aggregate.halfDay +
            aggregate.workFromHome +
            aggregate.onLeave,
          workFromHome: aggregate.workFromHome,
        },
        branch: row.branch,
        company: row.company,
        department: row.department,
        designation: row.designation,
        employeeId: row.employee_id,
        encashment: {
          amount: round(aggregate.encashmentAmount),
          days: round(aggregate.encashmentDays),
        },
        id: row.id,
        leavesByType: [...aggregate.leavesByType.entries()].map(([leaveType, days]) => ({
          days: round(days),
          leaveType,
        })),
        lopDays,
        name: `${row.first_name} ${row.last_name}`,
        overtime: {
          amount: round(aggregate.overtimeAmount),
          holidayHours: round(aggregate.overtimeHoliday),
          standardHours: round(aggregate.overtimeStandard),
          totalHours: round(aggregate.overtimeTotal),
          weekendHours: round(aggregate.overtimeWeekend),
        },
        payableDays,
        status: row.status,
      };
    });

    const totals = {
      employeeCount: employeesOut.length,
      encashmentAmount: round(employeesOut.reduce((sum, row) => sum + row.encashment.amount, 0)),
      lopDays: round(employeesOut.reduce((sum, row) => sum + row.lopDays, 0)),
      overtimeAmount: round(employeesOut.reduce((sum, row) => sum + row.overtime.amount, 0)),
      payableDays: round(employeesOut.reduce((sum, row) => sum + row.payableDays, 0)),
    };

    const notes = [
      "payableDays = present + work_from_home + half_day * 0.5 + on_leave + approvedLeaveDays; lopDays = absent + half_day * 0.5.",
      "Cross-month overtime slips are prorated by overlapping days; half-day leave applications count 0.5 days.",
      "Encashments cover all approved/paid records regardless of month.",
      ...attendance.notes,
      ...overtime.notes,
      ...leaves.notes,
      ...encashments.notes,
    ];
    if (unmatchedAttendance > 0) {
      notes.push(`${unmatchedAttendance} attendance rows did not match a scoped employee.`);
    }
    if (parsed.leavePeriod) {
      notes.push(
        `Leave balances scoped to period "${parsed.leavePeriod}" are available via hr.leave.balance.get.`,
      );
    }

    return {
      employees: employeesOut,
      generatedAt: new Date().toISOString(),
      month: parsed.month,
      monthEnd,
      monthStart,
      notes,
      totals,
    };
  });
