import { hrPermission } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  module: pipe(string(), minLength(1, "module is required")),
});

export const listPermissionsByModule = Workflow.name("hr.access.list-permissions-by-module")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { module } = input;

    return ctx.db.select().from(hrPermission).where(eq(hrPermission.module, module));
  });
