import {
  department,
  employee,
  employeeGroup,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeTransfer,
  fullAndFinalStatement,
  holidayList,
  hrSettings,
  payrollSettings,
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
