import { leaveAllocation, leaveBlockList, leaveLedgerEntry } from "#/db-schemas";
import type { Db } from "#/workflows/db";
import { fetchLeaveAllocationById, fetchLeaveTypeById } from "#/workflows/fetch";

import { and, eq, sql } from "drizzle-orm";

// ─── Day-amount helpers ──────────────────────────────────────────────────────
// Leave balances are stored as text columns; every read/write funnels through
// these two helpers so float parsing lives in exactly one place.

export function toDays(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid day amount for "${label}": "${value}".`);
  }
  return parsed;
}

interface LeaveBalanceColumns {
  carryForwardedDays: string;
  earnedDays: string;
  totalDays: string;
  usedDays: string;
}

export function remainingDays(allocation: LeaveBalanceColumns): number {
  return (
    toDays(allocation.totalDays, "totalDays") +
    toDays(allocation.carryForwardedDays, "carryForwardedDays") +
    toDays(allocation.earnedDays, "earnedDays") -
    toDays(allocation.usedDays, "usedDays")
  );
}

export interface AllocationDays {
  allocated: number;
  carryForwarded: number;
  earned: number;
  remaining: number;
  used: number;
}

export function allocationDays(allocation: LeaveBalanceColumns): AllocationDays {
  const allocated = toDays(allocation.totalDays, "totalDays");
  const carryForwarded = toDays(allocation.carryForwardedDays, "carryForwardedDays");
  const earned = toDays(allocation.earnedDays, "earnedDays");
  const used = toDays(allocation.usedDays, "usedDays");
  return {
    allocated,
    carryForwarded,
    earned,
    remaining: allocated + carryForwarded + earned - used,
    used,
  };
}

// ─── Block-list / balance checks ─────────────────────────────────────────────

export async function checkLeaveBlockList(
  db: Db,
  options: { fromDate: string; toDate: string },
): Promise<void> {
  const { fromDate, toDate } = options;
  const blockedDates = await db
    .select()
    .from(leaveBlockList)
    .where(
      and(
        eq(leaveBlockList.isActive, true),
        sql`${leaveBlockList.fromDate} <= ${toDate}`,
        sql`${leaveBlockList.toDate} >= ${fromDate}`,
      ),
    );

  if (blockedDates.length > 0) {
    throw new Error(
      `Leave is blocked for the selected dates. Blocked periods: ${blockedDates
        .map((blockedPeriod) => blockedPeriod.name)
        .join(", ")}`,
    );
  }
}

export async function checkLeaveBalance(
  db: Db,
  options: {
    days: number;
    employeeId: string;
    leaveType: string;
  },
): Promise<void> {
  const { days, employeeId, leaveType: leaveTypeName } = options;
  const [allocations, leaveTypeRecord] = await Promise.all([
    db
      .select()
      .from(leaveAllocation)
      .where(
        and(
          eq(leaveAllocation.employeeId, employeeId),
          eq(leaveAllocation.leaveType, leaveTypeName),
          eq(leaveAllocation.status, "active"),
        ),
      ),
    fetchLeaveTypeById(db, leaveTypeName),
  ]);

  const [allocation] = allocations;
  if (!allocation) {
    if (!leaveTypeRecord.allowNegativeBalance) {
      throw new Error(`No active leave allocation found for leave type "${leaveTypeName}".`);
    }
    return;
  }

  const available = remainingDays(allocation);

  if (days > available && !leaveTypeRecord.allowNegativeBalance) {
    throw new Error(
      `Insufficient leave balance. Available: ${available} days, Requested: ${days} days.`,
    );
  }
}

// ─── Allocation / ledger records ─────────────────────────────────────────────
// Single owners for leaveAllocation / leaveLedgerEntry inserts so workflow
// actions and approval flows share one set of defaults.

export async function insertLeaveAllocation(
  db: Db,
  input: {
    carryForwardedDays: string;
    earnedDays?: string;
    employeeId: string;
    leavePeriod: string;
    leavePolicyAssignment?: string | null;
    leaveType: string;
    totalDays: string;
    usedDays?: string;
  },
) {
  const [result] = await db
    .insert(leaveAllocation)
    .values({
      carryForwardedDays: input.carryForwardedDays,
      earnedDays: input.earnedDays ?? "0",
      employeeId: input.employeeId,
      leavePeriod: input.leavePeriod,
      leavePolicyAssignment: input.leavePolicyAssignment ?? null,
      leaveType: input.leaveType,
      totalDays: input.totalDays,
      usedDays: input.usedDays ?? "0",
    })
    .returning();

  if (!result) {
    throw new Error("Failed to create leave allocation.");
  }

  return result;
}

export async function updateLeaveAllocation(db: Db, id: string, patch: { usedDays: string }) {
  const [updated] = await db
    .update(leaveAllocation)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(leaveAllocation.id, id))
    .returning();

  return updated;
}

/**
 * Adjust an allocation's used-days by a signed delta inside the caller's
 * transaction. Approve flows pass a positive delta, cancel flows a negative
 * one (floored at zero so a cancel can never drive the balance negative).
 */
export async function adjustAllocationUsage(
  db: Db,
  allocationId: string,
  adjustment: { deltaDays: number; floorAtZero: boolean },
) {
  const allocation = await fetchLeaveAllocationById(db, allocationId);
  const next = toDays(allocation.usedDays, "usedDays") + adjustment.deltaDays;
  return updateLeaveAllocation(db, allocationId, {
    usedDays: (adjustment.floorAtZero ? Math.max(0, next) : next).toString(),
  });
}

export async function insertLeaveLedgerEntry(
  db: Db,
  input: {
    days: string;
    description: string;
    employeeId: string;
    leaveApplication?: string;
    leaveType: string;
    transactionType: string;
  },
) {
  const [result] = await db
    .insert(leaveLedgerEntry)
    .values({
      days: input.days,
      description: input.description,
      employeeId: input.employeeId,
      leaveApplication: input.leaveApplication ?? null,
      leaveType: input.leaveType,
      transactionType: input.transactionType,
    })
    .returning();

  if (!result) {
    throw new Error("Failed to create leave ledger entry.");
  }

  return result;
}
