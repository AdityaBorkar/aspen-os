import { Workflow } from "@aspen-os/platform/server";
import { minLength, object, optional, pipe, string } from "valibot";

import { getUserPermissionsUtil } from "../utils";

const InputSchema = object({
  action: pipe(string(), minLength(1, "action is required")),
  branchId: optional(pipe(string(), minLength(1, "branchId is required"))),
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
  module: pipe(string(), minLength(1, "module is required")),
});

export const hasPermission = Workflow.name("hr.access.has-permission")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId, module, action, branchId } = input;

    const permissions = await getUserPermissionsUtil(ctx.db, hrUserId, branchId);
    return permissions.some(
      (permission) => permission.module === module && permission.action === action,
    );
  });
