import { hrRole } from "#/db-schemas";
import { HrRoleFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(HrRoleFiltersSchema),
});

export const listRoles = Workflow.name("hr.access.list-roles")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(HrRoleFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.isActive !== undefined) {
      conditions.push(eq(hrRole.isActive, parsed.isActive));
    }
    if (parsed.isSystem !== undefined) {
      conditions.push(eq(hrRole.isSystem, parsed.isSystem));
    }
    if (parsed.name) {
      conditions.push(eq(hrRole.name, parsed.name));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(hrRole).where(whereClause);
  });
