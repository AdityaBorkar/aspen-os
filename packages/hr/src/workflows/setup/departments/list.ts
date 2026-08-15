import { department } from "#/db-schemas";
import { DepartmentFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(DepartmentFiltersSchema),
});

export const listDepartments = Workflow.name("hr.setup.list-departments")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(DepartmentFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.isActive !== undefined) {
      conditions.push(eq(department.isActive, parsed.isActive));
    }
    if (parsed.parentDepartment) {
      conditions.push(eq(department.parentDepartment, parsed.parentDepartment));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(department).where(whereClause);
  });
