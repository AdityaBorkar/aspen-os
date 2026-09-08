import { attendance, attendanceRequest } from "#/db-schemas/attendance";
import { overtimeSlip, overtimeType } from "#/db-schemas/overtime";
import { shiftRequest, shiftSchedule, shiftType } from "#/db-schemas/shift";
import type { Db } from "#/workflows/db";

import { and, eq } from "drizzle-orm";

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

export function fetchAttendanceRequestById(db: Db, id: string) {
  return fetchById(
    db.select().from(attendanceRequest).where(eq(attendanceRequest.id, id)).limit(1),
    "Attendance request",
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
