import { hrUserRole } from "#/db-schemas";
import { AssignRoleSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: AssignRoleSchema,
});

export const assignRoleToUser = Workflow.name("hr.access.assign-role-to-user")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(hrUserRole)
      .values({
        branch_id: parsed.branchId,
        hr_user_id: parsed.hrUserId,
        role_id: parsed.roleId,
      })
      .returning();
    return result;
  });
