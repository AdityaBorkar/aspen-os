import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { hrRolePermission } from "../db-schemas";
import { AssignPermissionSchema } from "../types";

const InputSchema = object({
  input: AssignPermissionSchema,
});

export const assignPermissionToRole = Workflow.name("hr.access.assign-permission-to-role")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AssignPermissionSchema, input);

    const [result] = await ctx.db
      .insert(hrRolePermission)
      .values({
        permissionId: parsed.permissionId,
        roleId: parsed.roleId,
      })
      .returning();
    return result;
  });
