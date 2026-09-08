import {
  compensatoryLeaveRequest,
  leaveAllocation,
  leaveApplication,
  leaveEncashment,
  leavePeriod,
  leavePolicy,
  leaveType,
} from "#/db-schemas";
import type { Db } from "#/workflows/db";

import { eq } from "drizzle-orm";

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

export function fetchLeaveEncashmentById(db: Db, id: string) {
  return fetchById(
    db.select().from(leaveEncashment).where(eq(leaveEncashment.id, id)).limit(1),
    "Leave encashment",
    id,
  );
}
