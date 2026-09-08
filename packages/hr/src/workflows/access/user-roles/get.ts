import { hrUserRole } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const getUserRoles = Workflow.name("hr.access.get-user-roles")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId } = input;

    return ctx.db
      .select({
        branchId: hrUserRole.branch_id,
        hrUserId: hrUserRole.hr_user_id,
        id: hrUserRole.id,
        roleId: hrUserRole.role_id,
      })
      .from(hrUserRole)
      .where(eq(hrUserRole.hr_user_id, hrUserId));
  });
