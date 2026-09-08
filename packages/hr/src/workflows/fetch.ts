import {
  attendance,
  attendanceRequest,
  compensatoryLeaveRequest,
  department,
  employee,
  employeeGroup,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeTransfer,
  fullAndFinalStatement,
  holidayList,
  leaveAllocation,
  leaveApplication,
  leaveEncashment,
  leavePeriod,
  leavePolicy,
  leaveType,
  overtimeSlip,
  overtimeType,
  payrollSettings,
  hrSettings,
  shiftRequest,
  shiftSchedule,
  shiftType,
} from "#/db-schemas";
import type { Db } from "#/workflows/db";

import { and, eq, sql } from "drizzle-orm";

// ─── Shared guards ───────────────────────────────────────────────────────────

async function fetchById<TRow>(rows: Promise<TRow[]>, noun: string, id: string): Promise<TRow> {
  const [result] = await rows;
  if (!result) {
    throw new Error(`${noun} with id "${id}" not found.`);
  }
  return result;
}

export function assertUpdated<TRow>(row: TRow | undefined, label: string): TRow {
  if (!row) {
    throw new Error(`${label} not found.`);
  }
  return row;
}

export function requireStatus(
  row: { status: string },
  allowed: string | string[],
  label: string,
): void {
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedList.includes(row.status)) {
    throw new Error(
      `${label} cannot transition from status "${row.status}". Expected: ${allowedList.join(" | ")}.`,
    );
  }
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export async function ensureNoDuplicateAttendance(
  db: Db,
  employeeId: string,
  date: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.employee_id, employeeId), eq(attendance.date, date)))
    .limit(1);

  if (existing) {
    throw new Error(`Attendance already exists for employee "${employeeId}" on date "${date}".`);
  }
}

// ─── Employee ────────────────────────────────────────────────────────────────

export function fetchEmployeeById(db: Db, id: string) {
  return fetchById(db.select().from(employee).where(eq(employee.id, id)).limit(1), "Employee", id);
}

export function fetchEmployeeGroupById(db: Db, id: string) {
  return fetchById(
    db.select().from(employeeGroup).where(eq(employeeGroup.id, id)).limit(1),
    "Employee group",
    id,
  );
}

export async function ensureEmployeeIdUnique(
  db: Db,
  employeeId: string,
  excludeId?: string,
): Promise<void> {
  const conditions = [eq(employee.employee_id, employeeId)];
  if (excludeId) {
    conditions.push(sql`${employee.id} != ${excludeId}`);
  }

  const [existing] = await db
    .select({ id: employee.id })
    .from(employee)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Employee ID "${employeeId}" already exists.`);
  }
}

// ─── Leave lookups ───────────────────────────────────────────────────────────

export function fetchLeaveTypeById(db: Db, id: string) {
  return fetchById(
    db.select().from(leaveType).where(eq(leaveType.id, id)).limit(1),
    "Leave type",
    id,
  );
}

export function fetchLeavePeriodById(db: Db, id: string) {
  return fetchById(
    db.select().from(leavePeriod).where(eq(leavePeriod.id, id)).limit(1),
    "Leave period",
    id,
  );
}

export function fetchLeavePolicyById(db: Db, id: string) {
  return fetchById(
    db.select().from(leavePolicy).where(eq(leavePolicy.id, id)).limit(1),
    "Leave policy",
    id,
  );
}

export function fetchLeaveAllocationById(db: Db, id: string) {
  return fetchById(
    db.select().from(leaveAllocation).where(eq(leaveAllocation.id, id)).limit(1),
    "Leave allocation",
    id,
  );
}

export function fetchLeaveApplicationById(db: Db, id: string) {
  return fetchById(
    db.select().from(leaveApplication).where(eq(leaveApplication.id, id)).limit(1),
    "Leave application",
    id,
  );
}

export function fetchCompensatoryLeaveById(db: Db, id: string) {
  return fetchById(
    db.select().from(compensatoryLeaveRequest).where(eq(compensatoryLeaveRequest.id, id)).limit(1),
    "Compensatory leave request",
    id,
  );
}

export function fetchAttendanceRequestById(db: Db, id: string) {
  return fetchById(
    db.select().from(attendanceRequest).where(eq(attendanceRequest.id, id)).limit(1),
    "Attendance request",
    id,
  );
}

export function fetchLeaveEncashmentById(db: Db, id: string) {
  return fetchById(
    db.select().from(leaveEncashment).where(eq(leaveEncashment.id, id)).limit(1),
    "Leave encashment",
    id,
  );
}

// ─── Lifecycle lookups ───────────────────────────────────────────────────────

export function fetchOnboardingById(db: Db, id: string) {
  return fetchById(
    db.select().from(employeeOnboarding).where(eq(employeeOnboarding.id, id)).limit(1),
    "Onboarding",
    id,
  );
}

export function fetchPromotionById(db: Db, id: string) {
  return fetchById(
    db.select().from(employeePromotion).where(eq(employeePromotion.id, id)).limit(1),
    "Promotion",
    id,
  );
}

export function fetchTransferById(db: Db, id: string) {
  return fetchById(
    db.select().from(employeeTransfer).where(eq(employeeTransfer.id, id)).limit(1),
    "Transfer",
    id,
  );
}

export function fetchSeparationById(db: Db, id: string) {
  return fetchById(
    db.select().from(employeeSeparation).where(eq(employeeSeparation.id, id)).limit(1),
    "Separation",
    id,
  );
}

export function fetchFullAndFinalById(db: Db, id: string) {
  return fetchById(
    db.select().from(fullAndFinalStatement).where(eq(fullAndFinalStatement.id, id)).limit(1),
    "Full and final statement",
    id,
  );
}

// ─── Overtime lookups ────────────────────────────────────────────────────────

export function fetchOvertimeTypeById(db: Db, id: string) {
  return fetchById(
    db.select().from(overtimeType).where(eq(overtimeType.id, id)).limit(1),
    "Overtime type",
    id,
  );
}

export function fetchOvertimeSlipById(db: Db, id: string) {
  return fetchById(
    db.select().from(overtimeSlip).where(eq(overtimeSlip.id, id)).limit(1),
    "Overtime slip",
    id,
  );
}

// ─── Setup lookups ───────────────────────────────────────────────────────────

export async function fetchHrSettings(db: Db) {
  const [settings] = await db.select().from(hrSettings).limit(1);
  return settings ?? null;
}

export async function fetchPayrollSettings(db: Db) {
  const [settings] = await db.select().from(payrollSettings).limit(1);
  return settings ?? null;
}

export function fetchHolidayListById(db: Db, id: string) {
  return fetchById(
    db.select().from(holidayList).where(eq(holidayList.id, id)).limit(1),
    "Holiday list",
    id,
  );
}

export function fetchDepartmentById(db: Db, id: string) {
  return fetchById(
    db.select().from(department).where(eq(department.id, id)).limit(1),
    "Department",
    id,
  );
}

// ─── Shift lookups ───────────────────────────────────────────────────────────

export function fetchShiftTypeById(db: Db, id: string) {
  return fetchById(
    db.select().from(shiftType).where(eq(shiftType.id, id)).limit(1),
    "Shift type",
    id,
  );
}

export function fetchShiftRequestById(db: Db, id: string) {
  return fetchById(
    db.select().from(shiftRequest).where(eq(shiftRequest.id, id)).limit(1),
    "Shift request",
    id,
  );
}

export function fetchShiftScheduleById(db: Db, id: string) {
  return fetchById(
    db.select().from(shiftSchedule).where(eq(shiftSchedule.id, id)).limit(1),
    "Shift schedule",
    id,
  );
}
