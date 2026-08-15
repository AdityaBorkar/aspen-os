import { hrUserBranchAccess } from "#/db-schemas";
import { GrantBranchAccessSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: GrantBranchAccessSchema,
});

export const grantBranchAccess = Workflow.name("hr.access.grant-branch-access")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(GrantBranchAccessSchema, input);

    const [result] = await ctx.db
      .insert(hrUserBranchAccess)
      .values({
        accessLevel: parsed.accessLevel,
        branchId: parsed.branchId,
        hrUserId: parsed.hrUserId,
      })
      .returning();
    return result;
  });
