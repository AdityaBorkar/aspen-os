import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

import { employee } from "../../../db-schemas";
import { buildEmployeeTree } from "../../utils";

const InputSchema = object({
  company: optional(pipe(string(), minLength(1, "company is required"))),
});

export const getOrganizationalChart = Workflow.name("hr.employee.get-organizational-chart")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { company } = input;

    const conditions = [eq(employee.status, "active")];
    if (company) {
      conditions.push(eq(employee.company, company));
    }

    const allEmployees = await ctx.db
      .select({
        designation: employee.designation,
        firstName: employee.firstName,
        id: employee.id,
        image: employee.image,
        lastName: employee.lastName,
        reportsTo: employee.reportsTo,
      })
      .from(employee)
      .where(and(...conditions));

    return buildEmployeeTree(allEmployees, null);
  });
