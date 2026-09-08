import { hrUserRole } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  branchId: optional(pipe(string(), minLength(1, "branchId is required"))),
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
  roleId: pipe(string(), minLength(1, "roleId is required")),
});

export const removeRoleFromUser = Workflow.name("hr.access.remove-role-from-user")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId, roleId, branchId } = input;

    const conditions = [eq(hrUserRole.hr_user_id, hrUserId), eq(hrUserRole.role_id, roleId)];

    if (branchId !== undefined) {
      conditions.push(eq(hrUserRole.branch_id, branchId));
    }

    await ctx.db.delete(hrUserRole).where(and(...conditions));
  });
