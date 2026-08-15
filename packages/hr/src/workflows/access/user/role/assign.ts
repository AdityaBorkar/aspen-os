import { hrUserRole } from "#/db-schemas";
import { AssignRoleSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: AssignRoleSchema,
});

export const assignRoleToUser = Workflow.name("hr.access.assign-role-to-user")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AssignRoleSchema, input);

    const [result] = await ctx.db
      .insert(hrUserRole)
      .values({
        branchId: parsed.branchId,
        hrUserId: parsed.hrUserId,
        roleId: parsed.roleId,
      })
      .returning();
    return result;
  });
