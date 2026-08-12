import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrUserRole } from "../db-schemas";

const InputSchema = object({
  branchId: pipe(string(), minLength(1, "branchId is required")),
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const getUserRolesForBranch = Workflow.name(
  "hr.access.get-user-roles-for-branch",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId, branchId } = input;

    return ctx.db
      .select({
        branchId: hrUserRole.branchId,
        hrUserId: hrUserRole.hrUserId,
        id: hrUserRole.id,
        roleId: hrUserRole.roleId,
      })
      .from(hrUserRole)
      .where(
        and(
          eq(hrUserRole.hrUserId, hrUserId),
          or(isNull(hrUserRole.branchId), eq(hrUserRole.branchId, branchId)),
        ),
      );
  });
