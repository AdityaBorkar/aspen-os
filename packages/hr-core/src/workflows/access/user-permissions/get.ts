import { hrPermission, hrRolePermission, hrUserRole } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  branchId: optional(pipe(string(), minLength(1, "branchId is required"))),
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const getUserPermissions = Workflow.name("hr.access.get-user-permissions")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId, branchId } = input;

    const userRoles = await ctx.db
      .select({ roleId: hrUserRole.role_id })
      .from(hrUserRole)
      .where(
        and(
          eq(hrUserRole.hr_user_id, hrUserId),
          branchId
            ? or(isNull(hrUserRole.branch_id), eq(hrUserRole.branch_id, branchId))
            : undefined,
        ),
      );

    const roleIds = userRoles.map((ur) => ur.roleId);
    if (roleIds.length === 0) {
      return [];
    }

    const permissions = await ctx.db
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
  });
