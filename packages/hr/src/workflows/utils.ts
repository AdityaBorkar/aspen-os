import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { minLength, optional, pipe, string } from "valibot";

import {
  attendance,
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
  hrPermission,
  hrRolePermission,
  hrSettings,
  hrUserBranchAccess,
  hrUserRole,
  leaveAllocation,
  leaveApplication,
  leaveBlockList,
  leaveLedgerEntry,
  leavePeriod,
  leavePolicy,
  leaveType,
  overtimeSlip,
  overtimeType,
  payrollSettings,
  shiftAssignment,
  shiftRequest,
  shiftSchedule,
  shiftType,
} from "../db-schemas";
import type { EmployeeTreeNode, ResolvedPermission } from "../types";

export const IdSchema = pipe(string(), minLength(1, "ID is required"));

export const RequiredSchema = pipe(string(), minLength(1, "Value is required"));

export const OptionalSchema = optional(string());

// Org-chart structure: rows come from a drizzle select projection, so fields are
// Conservatively typed (`unknown`) to be robust regardless of drizzle typing
type OrgChartEmployee = {
  designation: unknown;
  firstName: unknown;
  id: unknown;
  image: unknown;
  lastName: unknown;
  reportsTo: unknown;
};

// ─── Attendance ────────────────────────────────────────────────────────────

export async function ensureNoDuplicateAttendance(
  db: NodePgDatabase,
  employeeId: string,
  date: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.employeeId, employeeId), eq(attendance.date, date)))
    .limit(1);

  if (existing) {
    throw new Error(`Attendance already exists for employee "${employeeId}" on date "${date}".`);
  }
}

// ─── Employee ──────────────────────────────────────────────────────────────

export async function fetchEmployeeById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(employee).where(eq(employee.id, id)).limit(1);

  if (!result) {
    throw new Error(`Employee with id "${id}" not found.`);
  }

  return result;
}

export async function fetchEmployeeGroupById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(employeeGroup).where(eq(employeeGroup.id, id)).limit(1);

  if (!result) {
    throw new Error(`Employee group with id "${id}" not found.`);
  }

  return result;
}

export async function ensureEmployeeIdUnique(
  db: NodePgDatabase,
  employeeId: string,
  excludeId?: string,
): Promise<void> {
  const conditions = [eq(employee.employeeId, employeeId)];
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

export function buildEmployeeTree(
  employees: OrgChartEmployee[],
  parentId: string | null,
): EmployeeTreeNode[] {
  return employees
    .filter((e) => e.reportsTo === parentId)
    .map((e) => ({
      children: buildEmployeeTree(employees, String(e.id)),
      designation: String(e.designation),
      id: String(e.id),
      image: e.image === null || e.image === undefined ? null : String(e.image),
      name: `${String(e.firstName)} ${String(e.lastName)}`.trim(),
    }));
}

// ─── Leave ─────────────────────────────────────────────────────────────────

export async function fetchLeaveTypeById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(leaveType).where(eq(leaveType.id, id)).limit(1);

  if (!result) {
    throw new Error(`Leave type with id "${id}" not found.`);
  }

  return result;
}

export async function fetchLeavePeriodById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(leavePeriod).where(eq(leavePeriod.id, id)).limit(1);

  if (!result) {
    throw new Error(`Leave period with id "${id}" not found.`);
  }

  return result;
}

export async function fetchLeavePolicyById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(leavePolicy).where(eq(leavePolicy.id, id)).limit(1);

  if (!result) {
    throw new Error(`Leave policy with id "${id}" not found.`);
  }

  return result;
}

export async function fetchLeaveAllocationById(db: NodePgDatabase, id: string) {
  const [result] = await db
    .select()
    .from(leaveAllocation)
    .where(eq(leaveAllocation.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Leave allocation with id "${id}" not found.`);
  }

  return result;
}

export async function fetchLeaveApplicationById(db: NodePgDatabase, id: string) {
  const [result] = await db
    .select()
    .from(leaveApplication)
    .where(eq(leaveApplication.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Leave application with id "${id}" not found.`);
  }

  return result;
}

export async function fetchCompensatoryLeaveById(db: NodePgDatabase, id: string) {
  const [result] = await db
    .select()
    .from(compensatoryLeaveRequest)
    .where(eq(compensatoryLeaveRequest.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Compensatory leave request with id "${id}" not found.`);
  }

  return result;
}

export async function createLeaveAllocation(
  db: NodePgDatabase,
  input: {
    carryForwardedDays: string;
    employeeId: string;
    leavePeriod: string;
    leavePolicyAssignment?: string;
    leaveType: string;
    totalDays: string;
    usedDays?: string;
  },
) {
  const [result] = await db
    .insert(leaveAllocation)
    .values({
      carryForwardedDays: input.carryForwardedDays,
      earnedDays: "0",
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

export async function updateLeaveAllocation(
  db: NodePgDatabase,
  id: string,
  patch: { usedDays: string },
) {
  const [updated] = await db
    .update(leaveAllocation)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(leaveAllocation.id, id))
    .returning();

  return updated;
}

export async function createLeaveLedgerEntry(
  db: NodePgDatabase,
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

export async function checkLeaveBlockList(
  db: NodePgDatabase,
  _employeeId: string,
  fromDate: string,
  toDate: string,
): Promise<void> {
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
        .map((b) => b.name)
        .join(", ")}`,
    );
  }
}

export async function checkLeaveBalance(
  db: NodePgDatabase,
  employeeId: string,
  leaveType: string,
  days: number,
): Promise<void> {
  const allocations = await db
    .select()
    .from(leaveAllocation)
    .where(
      and(
        eq(leaveAllocation.employeeId, employeeId),
        eq(leaveAllocation.leaveType, leaveType),
        eq(leaveAllocation.status, "active"),
      ),
    );

  const leaveTypeRecord = await fetchLeaveTypeById(db, leaveType);

  if (allocations.length === 0) {
    if (!leaveTypeRecord.allowNegativeBalance) {
      throw new Error(`No active leave allocation found for leave type "${leaveType}".`);
    }
    return;
  }

  const allocation = allocations[0];
  if (!allocation) {
    throw new Error(`No active leave allocation found for leave type "${leaveType}".`);
  }

  const available =
    parseFloat(allocation.totalDays) +
    parseFloat(allocation.carryForwardedDays) +
    parseFloat(allocation.earnedDays) -
    parseFloat(allocation.usedDays);

  if (days > available && !leaveTypeRecord.allowNegativeBalance) {
    throw new Error(
      `Insufficient leave balance. Available: ${available} days, Requested: ${days} days.`,
    );
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────

export async function fetchOnboardingById(db: NodePgDatabase, id: string) {
  const [result] = await db
    .select()
    .from(employeeOnboarding)
    .where(eq(employeeOnboarding.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Onboarding with id "${id}" not found.`);
  }

  return result;
}

export async function fetchPromotionById(db: NodePgDatabase, id: string) {
  const [result] = await db
    .select()
    .from(employeePromotion)
    .where(eq(employeePromotion.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Promotion with id "${id}" not found.`);
  }

  return result;
}

export async function fetchTransferById(db: NodePgDatabase, id: string) {
  const [result] = await db
    .select()
    .from(employeeTransfer)
    .where(eq(employeeTransfer.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Transfer with id "${id}" not found.`);
  }

  return result;
}

export async function fetchSeparationById(db: NodePgDatabase, id: string) {
  const [result] = await db
    .select()
    .from(employeeSeparation)
    .where(eq(employeeSeparation.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Separation with id "${id}" not found.`);
  }

  return result;
}

export async function fetchFullAndFinalById(db: NodePgDatabase, id: string) {
  const [result] = await db
    .select()
    .from(fullAndFinalStatement)
    .where(eq(fullAndFinalStatement.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Full and final statement with id "${id}" not found.`);
  }

  return result;
}

// ─── Overtime ──────────────────────────────────────────────────────────────

export async function fetchOvertimeTypeById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(overtimeType).where(eq(overtimeType.id, id)).limit(1);

  if (!result) {
    throw new Error(`Overtime type with id "${id}" not found.`);
  }

  return result;
}

export async function fetchOvertimeSlipById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(overtimeSlip).where(eq(overtimeSlip.id, id)).limit(1);

  if (!result) {
    throw new Error(`Overtime slip with id "${id}" not found.`);
  }

  return result;
}

// ─── Setup ─────────────────────────────────────────────────────────────────

export async function fetchHrSettings(db: NodePgDatabase) {
  const [settings] = await db.select().from(hrSettings).limit(1);
  return settings ?? null;
}

export async function fetchPayrollSettings(db: NodePgDatabase) {
  const [settings] = await db.select().from(payrollSettings).limit(1);
  return settings ?? null;
}

export async function fetchHolidayListById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(holidayList).where(eq(holidayList.id, id)).limit(1);

  if (!result) {
    throw new Error(`Holiday list with id "${id}" not found.`);
  }

  return result;
}

export async function fetchDepartmentById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(department).where(eq(department.id, id)).limit(1);

  if (!result) {
    throw new Error(`Department with id "${id}" not found.`);
  }

  return result;
}

export async function ensureDepartmentCodeUnique(
  db: NodePgDatabase,
  code: string,
  excludeId?: string,
): Promise<void> {
  const upperCode = code.toUpperCase();
  const conditions = [eq(department.code, upperCode)];
  if (excludeId) {
    conditions.push(sql`${department.id} != ${excludeId}`);
  }

  const [existing] = await db
    .select({ id: department.id })
    .from(department)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Department code "${upperCode}" already exists.`);
  }
}

export async function wouldCreateCircular(
  db: NodePgDatabase,
  deptId: string,
  newParentId: string,
): Promise<boolean> {
  let currentId: string | null = newParentId;
  let depth = 0;
  const maxDepth = 10;

  while (currentId !== null) {
    if (currentId === deptId) {
      return true;
    }
    if (depth >= maxDepth) {
      return true;
    }

    const [parent] = await db
      .select({ parentDepartment: department.parentDepartment })
      .from(department)
      .where(eq(department.id, currentId))
      .limit(1);

    if (!parent) {
      break;
    }
    currentId = parent.parentDepartment;
    depth++;
  }

  return false;
}

export async function validateParentDepartment(
  db: NodePgDatabase,
  parentId: string,
  childId?: string,
): Promise<void> {
  if (childId) {
    const wouldCycle = await wouldCreateCircular(db, childId, parentId);
    if (wouldCycle) {
      throw new Error("Setting this parent would create a circular reference.");
    }
  }
}

// ─── Shift ─────────────────────────────────────────────────────────────────

export async function fetchShiftTypeById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(shiftType).where(eq(shiftType.id, id)).limit(1);

  if (!result) {
    throw new Error(`Shift type with id "${id}" not found.`);
  }

  return result;
}

export async function fetchShiftRequestById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(shiftRequest).where(eq(shiftRequest.id, id)).limit(1);

  if (!result) {
    throw new Error(`Shift request with id "${id}" not found.`);
  }

  return result;
}

export async function fetchShiftScheduleById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(shiftSchedule).where(eq(shiftSchedule.id, id)).limit(1);

  if (!result) {
    throw new Error(`Shift schedule with id "${id}" not found.`);
  }

  return result;
}

export async function hasBranchAccessUtil(db: NodePgDatabase, hrUserId: string, branchId: string) {
  const [direct] = await db
    .select({ id: hrUserBranchAccess.id })
    .from(hrUserBranchAccess)
    .where(
      and(eq(hrUserBranchAccess.hrUserId, hrUserId), eq(hrUserBranchAccess.branchId, branchId)),
    )
    .limit(1);
  if (direct) {
    return true;
  }

  const [roleBased] = await db
    .select({ id: hrUserRole.id })
    .from(hrUserRole)
    .where(and(eq(hrUserRole.hrUserId, hrUserId), eq(hrUserRole.branchId, branchId)))
    .limit(1);
  return Boolean(roleBased);
}

export async function getUserPermissionsUtil(
  db: NodePgDatabase,
  hrUserId: string,
  branchId?: string,
): Promise<ResolvedPermission[]> {
  const userRoles = await db
    .select({ roleId: hrUserRole.roleId })
    .from(hrUserRole)
    .where(
      and(
        eq(hrUserRole.hrUserId, hrUserId),
        branchId ? or(isNull(hrUserRole.branchId), eq(hrUserRole.branchId, branchId)) : undefined,
      ),
    );

  const roleIds = userRoles.map((ur) => ur.roleId);
  if (roleIds.length === 0) {
    return [];
  }

  const permissions = await db
    .select({
      action: hrPermission.action,
      module: hrPermission.module,
    })
    .from(hrRolePermission)
    .innerJoin(hrPermission, eq(hrRolePermission.permissionId, hrPermission.id))
    .where(inArray(hrRolePermission.roleId, roleIds));

  const seen = new Set<string>();
  return permissions.filter((p) => {
    const key = `${p.module}:${p.action}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function getUserRolesForBranchUtil(
  db: NodePgDatabase,
  hrUserId: string,
  branchId: string,
) {
  return db
    .select({
      branchId: hrUserRole.branchId,
      hrUserId: hrUserRole.hrUserId,
      id: hrUserRole.id,
      roleId: hrUserRole.roleId,
    })
    .from(hrUserRole)
    .where(
      and(
        eq(hrUserRole.hrUserId, hrUserId),
        or(isNull(hrUserRole.branchId), eq(hrUserRole.branchId, branchId)),
      ),
    );
}

export async function getAccessibleBranchesUtil(
  db: NodePgDatabase,
  hrUserId: string,
): Promise<string[]> {
  const direct = await db
    .select({ branchId: hrUserBranchAccess.branchId })
    .from(hrUserBranchAccess)
    .where(eq(hrUserBranchAccess.hrUserId, hrUserId));

  const roleBased = await db
    .select({ branchId: hrUserRole.branchId })
    .from(hrUserRole)
    .where(and(eq(hrUserRole.hrUserId, hrUserId), isNotNull(hrUserRole.branchId)));

  const branchIds = new Set<string>();
  for (const d of direct) {
    branchIds.add(d.branchId);
  }
  for (const r of roleBased) {
    if (r.branchId) {
      branchIds.add(r.branchId);
    }
  }
  return [...branchIds];
}

export async function createShiftAssignment(
  db: NodePgDatabase,
  input: {
    employeeId: string;
    endDate?: string;
    notes?: string;
    shiftLocation?: string;
    shiftType: string;
    startDate: string;
  },
) {
  const [result] = await db
    .insert(shiftAssignment)
    .values({
      employeeId: input.employeeId,
      endDate: input.endDate ?? null,
      notes: input.notes ?? null,
      shiftLocation: input.shiftLocation ?? null,
      shiftType: input.shiftType,
      startDate: input.startDate,
    })
    .returning();

  return result;
}
