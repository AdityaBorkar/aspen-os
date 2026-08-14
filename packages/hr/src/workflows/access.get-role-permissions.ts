import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrPermission, hrRolePermission } from "../db-schemas";

const InputSchema = object({
  roleId: pipe(string(), minLength(1, "roleId is required")),
});

export const getRolePermissions = Workflow.name("hr.access.get-role-permissions")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { roleId } = input;

    return ctx.db
      .select({
        action: hrPermission.action,
        description: hrPermission.description,
        id: hrPermission.id,
        module: hrPermission.module,
      })
      .from(hrRolePermission)
      .innerJoin(hrPermission, eq(hrRolePermission.permissionId, hrPermission.id))
      .where(eq(hrRolePermission.roleId, roleId));
  });
