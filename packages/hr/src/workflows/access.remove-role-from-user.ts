import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

import { hrUserRole } from "../db-schemas";

const InputSchema = object({
  branchId: optional(pipe(string(), minLength(1, "branchId is required"))),
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
  roleId: pipe(string(), minLength(1, "roleId is required")),
});

export const removeRoleFromUser = Workflow.name(
  "hr.access.remove-role-from-user",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId, roleId, branchId } = input;

    const conditions = [
      eq(hrUserRole.hrUserId, hrUserId),
      eq(hrUserRole.roleId, roleId),
    ];

    if (branchId !== undefined) {
      conditions.push(eq(hrUserRole.branchId, branchId));
    }

    await ctx.db.delete(hrUserRole).where(and(...conditions));
  });
