import { hrUserRole } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  branchId: pipe(string(), minLength(1, "branchId is required")),
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const getUserRolesForBranch = Workflow.name("hr.access.get-user-roles-for-branch")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId, branchId } = input;

    return ctx.db
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
  });
