import { employee } from "#/db-schemas";
import { resolveManagerIdMap } from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  managerId: pipe(string(), minLength(1, "managerId is required")),
});

export const getDirectReports = Workflow.name("hr.position.get-direct-reports")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { managerId } = input;

    const employees = await ctx.db.select().from(employee).where(eq(employee.status, "active"));
    const managerMap = await resolveManagerIdMap(ctx.db, employees);

    return employees.filter((employeeItem) => managerMap.get(employeeItem.id) === managerId);
  });
