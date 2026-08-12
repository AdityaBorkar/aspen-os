import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { hrPermission } from "../db-schemas";
import { HrPermissionFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(HrPermissionFiltersSchema),
});

export const listPermissions = Workflow.name("hr.access.list-permissions")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(HrPermissionFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.action) conditions.push(eq(hrPermission.action, parsed.action));
    if (parsed.module) conditions.push(eq(hrPermission.module, parsed.module));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(hrPermission).where(whereClause);
  });
