import { employee } from "#/db-schemas";
import { resolveManagerIdMap } from "#/utils/position-utils";
import { fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

export const getPeers = Workflow.name("hr.position.get-peers")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    await fetchEmployeeById(ctx.db, employeeId);

    const employees = await ctx.db.select().from(employee).where(eq(employee.status, "active"));
    const managerMap = await resolveManagerIdMap(ctx.db, employees);

    const managerId = managerMap.get(employeeId);

    return employees.filter(
      (employeeItem) =>
        employeeItem.id !== employeeId && managerMap.get(employeeItem.id) === managerId,
    );
  });
