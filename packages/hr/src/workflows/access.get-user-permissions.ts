import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

import { hrPermission, hrRolePermission, hrUserRole } from "../db-schemas";

const InputSchema = object({
  branchId: optional(pipe(string(), minLength(1, "branchId is required"))),
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const getUserPermissions = Workflow.name("hr.access.get-user-permissions")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId, branchId } = input;

    const userRoles = await ctx.db
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

    const permissions = await ctx.db
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
  });
