import { hrPermission, hrRolePermission, hrUserBranchAccess, hrUserRole } from "#/db-schemas";
import type { ResolvedPermission } from "#/types";
import type { Db } from "#/workflows/db";

import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";

export async function hasBranchAccessUtil(db: Db, hrUserId: string, branchId: string) {
  const [direct] = await db
    .select({ id: hrUserBranchAccess.id })
    .from(hrUserBranchAccess)
    .where(
      and(eq(hrUserBranchAccess.hr_user_id, hrUserId), eq(hrUserBranchAccess.branch_id, branchId)),
    )
    .limit(1);
  if (direct) {
    return true;
  }

  const [roleBased] = await db
    .select({ id: hrUserRole.id })
    .from(hrUserRole)
    .where(and(eq(hrUserRole.hr_user_id, hrUserId), eq(hrUserRole.branch_id, branchId)))
    .limit(1);
  return Boolean(roleBased);
}

export async function getUserPermissionsUtil(
  db: Db,
  hrUserId: string,
  branchId?: string,
): Promise<ResolvedPermission[]> {
  const userRoles = await db
    .select({ roleId: hrUserRole.role_id })
    .from(hrUserRole)
    .where(
      and(
        eq(hrUserRole.hr_user_id, hrUserId),
        branchId ? or(isNull(hrUserRole.branch_id), eq(hrUserRole.branch_id, branchId)) : undefined,
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
    .innerJoin(hrPermission, eq(hrRolePermission.permission_id, hrPermission.id))
    .where(inArray(hrRolePermission.role_id, roleIds));

  const seen = new Set<string>();
  return permissions.filter((permission) => {
    const key = `${permission.module}:${permission.action}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function getUserRolesForBranchUtil(db: Db, hrUserId: string, branchId: string) {
  return db
    .select({
      branchId: hrUserRole.branch_id,
      hrUserId: hrUserRole.hr_user_id,
      id: hrUserRole.id,
      roleId: hrUserRole.role_id,
    })
    .from(hrUserRole)
    .where(
      and(
        eq(hrUserRole.hr_user_id, hrUserId),
        or(isNull(hrUserRole.branch_id), eq(hrUserRole.branch_id, branchId)),
      ),
    );
}

export async function getAccessibleBranchesUtil(db: Db, hrUserId: string): Promise<string[]> {
  const [direct, roleBased] = await Promise.all([
    db
      .select({ branchId: hrUserBranchAccess.branch_id })
      .from(hrUserBranchAccess)
      .where(eq(hrUserBranchAccess.hr_user_id, hrUserId)),
    db
      .select({ branchId: hrUserRole.branch_id })
      .from(hrUserRole)
      .where(and(eq(hrUserRole.hr_user_id, hrUserId), isNotNull(hrUserRole.branch_id))),
  ]);

  const branchIds = new Set<string>([
    ...direct.map((row) => row.branchId),
    ...roleBased.map((row) => row.branchId).filter((branchId) => branchId !== null),
  ]);
  return [...branchIds];
}
