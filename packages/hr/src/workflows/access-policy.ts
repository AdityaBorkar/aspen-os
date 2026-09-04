import { hrPermission, hrRolePermission, hrUserBranchAccess, hrUserRole } from "#/db-schemas";
import type { ResolvedPermission } from "#/types";
import type { Db } from "#/workflows/db";

import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";

export async function hasBranchAccessUtil(db: Db, hrUserId: string, branchId: string) {
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
  db: Db,
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

export async function getAccessibleBranchesUtil(db: Db, hrUserId: string): Promise<string[]> {
  const [direct, roleBased] = await Promise.all([
    db
      .select({ branchId: hrUserBranchAccess.branchId })
      .from(hrUserBranchAccess)
      .where(eq(hrUserBranchAccess.hrUserId, hrUserId)),
    db
      .select({ branchId: hrUserRole.branchId })
      .from(hrUserRole)
      .where(and(eq(hrUserRole.hrUserId, hrUserId), isNotNull(hrUserRole.branchId))),
  ]);

  const branchIds = new Set<string>([
    ...direct.map((row) => row.branchId),
    ...roleBased.map((row) => row.branchId).filter((branchId) => branchId !== null),
  ]);
  return [...branchIds];
}
