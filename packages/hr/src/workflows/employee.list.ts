import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { employee } from "../db-schemas";
import { EmployeeFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(EmployeeFiltersSchema),
});

export const list = Workflow.name("hr.employee.list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(EmployeeFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.company) {
      conditions.push(eq(employee.company, parsed.company));
    }
    if (parsed.department) {
      conditions.push(eq(employee.department, parsed.department));
    }
    if (parsed.designation) {
      conditions.push(eq(employee.designation, parsed.designation));
    }
    if (parsed.branch) {
      conditions.push(eq(employee.branch, parsed.branch));
    }
    if (parsed.grade) {
      conditions.push(eq(employee.grade, parsed.grade));
    }
    if (parsed.employmentType) {
      conditions.push(eq(employee.employmentType, parsed.employmentType));
    }
    if (parsed.status) {
      conditions.push(eq(employee.status, parsed.status));
    }
    if (parsed.reportsTo) {
      conditions.push(eq(employee.reportsTo, parsed.reportsTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(employee).where(whereClause);
  });
