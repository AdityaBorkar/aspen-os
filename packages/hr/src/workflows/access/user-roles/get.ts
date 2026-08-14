import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrUserRole } from "../../../db-schemas";

const InputSchema = object({
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const getUserRoles = Workflow.name("hr.access.get-user-roles")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId } = input;

    return ctx.db
      .select({
        branchId: hrUserRole.branchId,
        hrUserId: hrUserRole.hrUserId,
        id: hrUserRole.id,
        roleId: hrUserRole.roleId,
      })
      .from(hrUserRole)
      .where(eq(hrUserRole.hrUserId, hrUserId));
  });
