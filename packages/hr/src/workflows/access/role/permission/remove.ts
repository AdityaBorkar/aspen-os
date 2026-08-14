import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrRolePermission } from "../../../../db-schemas";

const InputSchema = object({
  permissionId: pipe(string(), minLength(1, "permissionId is required")),
  roleId: pipe(string(), minLength(1, "roleId is required")),
});

export const removePermissionFromRole = Workflow.name("hr.access.remove-permission-from-role")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { roleId, permissionId } = input;

    await ctx.db
      .delete(hrRolePermission)
      .where(
        and(eq(hrRolePermission.roleId, roleId), eq(hrRolePermission.permissionId, permissionId)),
      );
  });
