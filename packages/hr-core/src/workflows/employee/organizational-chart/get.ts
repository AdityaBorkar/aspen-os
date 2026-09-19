import { employee } from "#/db-schemas";
import { buildEmployeeTree } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

const ChartFiltersSchema = object({
  branch: optional(string()),
  department: optional(string()),
});

const InputSchema = object({
  company: optional(pipe(string(), minLength(1, "company is required"))),
  filters: optional(ChartFiltersSchema),
});

export const getOrganizationalChart = Workflow.name("hr.employee.get-organizational-chart")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { company, filters } = input;

    const conditions = [eq(employee.status, "active")];
    if (company) {
      conditions.push(eq(employee.company, company));
    }
    if (filters?.department) {
      conditions.push(eq(employee.department, filters.department));
    }
    if (filters?.branch) {
      conditions.push(eq(employee.branch, filters.branch));
    }

    const rows = await ctx.db
      .select({
        department: employee.department,
        firstName: employee.first_name,
        id: employee.id,
        image: employee.image,
        lastName: employee.last_name,
        reportsTo: employee.reports_to,
      })
      .from(employee)
      .where(and(...conditions));

    return buildEmployeeTree(rows, null);
  });
