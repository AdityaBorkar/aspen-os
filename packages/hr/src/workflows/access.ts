import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import {
  hrPermission,
  hrRole,
  hrRolePermission,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
} from "../db-schema";
import type {
  AssignPermissionInput,
  AssignRoleInput,
  CreateHrPermissionInput,
  CreateHrRoleInput,
  CreateHrUserInput,
  GrantBranchAccessInput,
  HrPermissionFilters,
  HrRoleFilters,
  HrUserFilters,
  ResolvedPermission,
  UpdateBranchAccessInput,
  UpdateHrRoleInput,
  UpdateHrUserInput,
} from "../types";
import {
  AssignPermissionSchema,
  AssignRoleSchema,
  CreateHrPermissionSchema,
  CreateHrRoleSchema,
  CreateHrUserSchema,
  GrantBranchAccessSchema,
  HrPermissionFiltersSchema,
  HrRoleFiltersSchema,
  HrUserFiltersSchema,
  UpdateBranchAccessSchema,
  UpdateHrRoleSchema,
  UpdateHrUserSchema,
} from "../types";

export class AccessWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  // ─── HR User (Canvas-like system users linked to employees) ──────────────

  async createUser(input: CreateHrUserInput) {
    const parsed = parse(CreateHrUserSchema, input);

    const [result] = await this.db
      .insert(hrUser)
      .values({
        employeeId: parsed.employeeId,
        isActive: parsed.isActive,
        userId: parsed.userId,
      })
      .returning();
    return result;
  }

  async getUserById(id: string) {
    const [record] = await this.db
      .select()
      .from(hrUser)
      .where(eq(hrUser.id, id))
      .limit(1);
    return record ?? null;
  }

  async getUserByEmployeeId(employeeId: string) {
    const [record] = await this.db
      .select()
      .from(hrUser)
      .where(eq(hrUser.employeeId, employeeId))
      .limit(1);
    return record ?? null;
  }

  async getUserByUserId(userId: string) {
    const [record] = await this.db
      .select()
      .from(hrUser)
      .where(eq(hrUser.userId, userId))
      .limit(1);
    return record ?? null;
  }

  async listUsers(filters?: HrUserFilters) {
    const parsed = filters ? parse(HrUserFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId)
      conditions.push(eq(hrUser.employeeId, parsed.employeeId));
    if (parsed.isActive !== undefined)
      conditions.push(eq(hrUser.isActive, parsed.isActive));
    if (parsed.userId) conditions.push(eq(hrUser.userId, parsed.userId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(hrUser).where(whereClause);
  }

  async updateUser(id: string, patch: UpdateHrUserInput) {
    const parsed = parse(UpdateHrUserSchema, patch);

    const [result] = await this.db
      .update(hrUser)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(hrUser.id, id))
      .returning();
    return result ?? null;
  }

  async deleteUser(id: string) {
    await this.db.delete(hrUser).where(eq(hrUser.id, id));
  }

  // ─── Custom Roles ───────────────────────────────────────────────────────

  async createRole(input: CreateHrRoleInput) {
    const parsed = parse(CreateHrRoleSchema, input);

    const [result] = await this.db
      .insert(hrRole)
      .values({
        description: parsed.description,
        isActive: parsed.isActive,
        isSystem: parsed.isSystem,
        name: parsed.name,
      })
      .returning();
    return result;
  }

  async getRoleById(id: string) {
    const [record] = await this.db
      .select()
      .from(hrRole)
      .where(eq(hrRole.id, id))
      .limit(1);
    return record ?? null;
  }

  async getRoleByName(name: string) {
    const [record] = await this.db
      .select()
      .from(hrRole)
      .where(eq(hrRole.name, name))
      .limit(1);
    return record ?? null;
  }

  async listRoles(filters?: HrRoleFilters) {
    const parsed = filters ? parse(HrRoleFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.isActive !== undefined)
      conditions.push(eq(hrRole.isActive, parsed.isActive));
    if (parsed.isSystem !== undefined)
      conditions.push(eq(hrRole.isSystem, parsed.isSystem));
    if (parsed.name) conditions.push(eq(hrRole.name, parsed.name));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(hrRole).where(whereClause);
  }

  async updateRole(id: string, patch: UpdateHrRoleInput) {
    const parsed = parse(UpdateHrRoleSchema, patch);

    const [result] = await this.db
      .update(hrRole)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(hrRole.id, id))
      .returning();
    return result ?? null;
  }

  async deleteRole(id: string) {
    const [role] = await this.db
      .select()
      .from(hrRole)
      .where(eq(hrRole.id, id))
      .limit(1);

    if (role?.isSystem) {
      throw new Error(`Cannot delete system role "${role.name}".`);
    }

    await this.db.delete(hrRole).where(eq(hrRole.id, id));
  }

  // ─── RBAC Permissions ───────────────────────────────────────────────────

  async createPermission(input: CreateHrPermissionInput) {
    const parsed = parse(CreateHrPermissionSchema, input);

    const [result] = await this.db
      .insert(hrPermission)
      .values({
        action: parsed.action,
        description: parsed.description,
        module: parsed.module,
      })
      .returning();
    return result;
  }

  async getPermissionById(id: string) {
    const [record] = await this.db
      .select()
      .from(hrPermission)
      .where(eq(hrPermission.id, id))
      .limit(1);
    return record ?? null;
  }

  async listPermissions(filters?: HrPermissionFilters) {
    const parsed = filters ? parse(HrPermissionFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.action) conditions.push(eq(hrPermission.action, parsed.action));
    if (parsed.module) conditions.push(eq(hrPermission.module, parsed.module));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(hrPermission).where(whereClause);
  }

  async listPermissionsByModule(module: string) {
    return this.db
      .select()
      .from(hrPermission)
      .where(eq(hrPermission.module, module));
  }

  async deletePermission(id: string) {
    await this.db.delete(hrPermission).where(eq(hrPermission.id, id));
  }

  // ─── Role-Permission Mapping ────────────────────────────────────────────

  async assignPermissionToRole(input: AssignPermissionInput) {
    const parsed = parse(AssignPermissionSchema, input);

    const [result] = await this.db
      .insert(hrRolePermission)
      .values({
        permissionId: parsed.permissionId,
        roleId: parsed.roleId,
      })
      .returning();
    return result;
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    await this.db
      .delete(hrRolePermission)
      .where(
        and(
          eq(hrRolePermission.roleId, roleId),
          eq(hrRolePermission.permissionId, permissionId),
        ),
      );
  }

  async getRolePermissions(roleId: string) {
    return this.db
      .select({
        action: hrPermission.action,
        description: hrPermission.description,
        id: hrPermission.id,
        module: hrPermission.module,
      })
      .from(hrRolePermission)
      .innerJoin(
        hrPermission,
        eq(hrRolePermission.permissionId, hrPermission.id),
      )
      .where(eq(hrRolePermission.roleId, roleId));
  }

  // ─── User-Role Assignment (Canvas-like context roles with branch scope) ──

  async assignRoleToUser(input: AssignRoleInput) {
    const parsed = parse(AssignRoleSchema, input);

    const [result] = await this.db
      .insert(hrUserRole)
      .values({
        branchId: parsed.branchId,
        hrUserId: parsed.hrUserId,
        roleId: parsed.roleId,
      })
      .returning();
    return result;
  }

  async removeRoleFromUser(
    hrUserId: string,
    roleId: string,
    branchId?: string,
  ) {
    const conditions = [
      eq(hrUserRole.hrUserId, hrUserId),
      eq(hrUserRole.roleId, roleId),
    ];

    if (branchId !== undefined) {
      conditions.push(eq(hrUserRole.branchId, branchId));
    }

    await this.db.delete(hrUserRole).where(and(...conditions));
  }

  async getUserRoles(hrUserId: string) {
    return this.db
      .select({
        branchId: hrUserRole.branchId,
        hrUserId: hrUserRole.hrUserId,
        id: hrUserRole.id,
        roleId: hrUserRole.roleId,
      })
      .from(hrUserRole)
      .where(eq(hrUserRole.hrUserId, hrUserId));
  }

  async getUserRolesForBranch(hrUserId: string, branchId: string) {
    return this.db
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

  // ─── Branch-wise Access Controls ────────────────────────────────────────

  async grantBranchAccess(input: GrantBranchAccessInput) {
    const parsed = parse(GrantBranchAccessSchema, input);

    const [result] = await this.db
      .insert(hrUserBranchAccess)
      .values({
        accessLevel: parsed.accessLevel,
        branchId: parsed.branchId,
        hrUserId: parsed.hrUserId,
      })
      .returning();
    return result;
  }

  async revokeBranchAccess(hrUserId: string, branchId: string) {
    await this.db
      .delete(hrUserBranchAccess)
      .where(
        and(
          eq(hrUserBranchAccess.hrUserId, hrUserId),
          eq(hrUserBranchAccess.branchId, branchId),
        ),
      );
  }

  async getUserBranches(hrUserId: string) {
    const records = await this.db
      .select({
        accessLevel: hrUserBranchAccess.accessLevel,
        branchId: hrUserBranchAccess.branchId,
        id: hrUserBranchAccess.id,
      })
      .from(hrUserBranchAccess)
      .where(eq(hrUserBranchAccess.hrUserId, hrUserId));
    return records;
  }

  async updateBranchAccess(id: string, patch: UpdateBranchAccessInput) {
    const parsed = parse(UpdateBranchAccessSchema, patch);

    const [result] = await this.db
      .update(hrUserBranchAccess)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(hrUserBranchAccess.id, id))
      .returning();
    return result ?? null;
  }

  async getAccessibleBranches(hrUserId: string): Promise<string[]> {
    const direct = await this.db
      .select({ branchId: hrUserBranchAccess.branchId })
      .from(hrUserBranchAccess)
      .where(eq(hrUserBranchAccess.hrUserId, hrUserId));

    const roleBased = await this.db
      .select({ branchId: hrUserRole.branchId })
      .from(hrUserRole)
      .where(
        and(eq(hrUserRole.hrUserId, hrUserId), isNotNull(hrUserRole.branchId)),
      );

    const branchIds = new Set<string>();
    for (const d of direct) branchIds.add(d.branchId);
    for (const r of roleBased) {
      if (r.branchId) branchIds.add(r.branchId);
    }
    return [...branchIds];
  }

  async hasBranchAccess(hrUserId: string, branchId: string) {
    const [direct] = await this.db
      .select({ id: hrUserBranchAccess.id })
      .from(hrUserBranchAccess)
      .where(
        and(
          eq(hrUserBranchAccess.hrUserId, hrUserId),
          eq(hrUserBranchAccess.branchId, branchId),
        ),
      )
      .limit(1);
    if (direct) return true;

    const [roleBased] = await this.db
      .select({ id: hrUserRole.id })
      .from(hrUserRole)
      .where(
        and(
          eq(hrUserRole.hrUserId, hrUserId),
          eq(hrUserRole.branchId, branchId),
        ),
      )
      .limit(1);
    return !!roleBased;
  }

  // ─── Permission Resolution (RBAC) ───────────────────────────────────────

  async getUserPermissions(
    hrUserId: string,
    branchId?: string,
  ): Promise<ResolvedPermission[]> {
    const userRoles = await this.db
      .select({ roleId: hrUserRole.roleId })
      .from(hrUserRole)
      .where(
        and(
          eq(hrUserRole.hrUserId, hrUserId),
          branchId
            ? or(isNull(hrUserRole.branchId), eq(hrUserRole.branchId, branchId))
            : undefined,
        ),
      );

    const roleIds = userRoles.map((ur) => ur.roleId);
    if (roleIds.length === 0) return [];

    const permissions = await this.db
      .select({
        action: hrPermission.action,
        module: hrPermission.module,
      })
      .from(hrRolePermission)
      .innerJoin(
        hrPermission,
        eq(hrRolePermission.permissionId, hrPermission.id),
      )
      .where(inArray(hrRolePermission.roleId, roleIds));

    const seen = new Set<string>();
    return permissions.filter((p) => {
      const key = `${p.module}:${p.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async hasPermission(
    hrUserId: string,
    module: string,
    action: string,
    branchId?: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(hrUserId, branchId);
    return permissions.some((p) => p.module === module && p.action === action);
  }
}
