import { department, employee, hrPosition } from "#/db-schemas";
import { buildDepartmentTree } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { count, eq } from "drizzle-orm";
import { object } from "valibot";

const InputSchema = object({});

export const getDepartmentTree = Workflow.name("hr.setup.get-department-tree")
  .input(InputSchema)
  .handler(async (_input, ctx) => {
    const [activeDepartments, employeeCounts, positionCounts] = await Promise.all([
      ctx.db.select().from(department).where(eq(department.isActive, true)),
      ctx.db
        .select({ count: count(), departmentId: employee.department })
        .from(employee)
        .where(eq(employee.status, "active"))
        .groupBy(employee.department),
      ctx.db
        .select({ count: count(), departmentId: hrPosition.department })
        .from(hrPosition)
        .where(eq(hrPosition.isActive, true))
        .groupBy(hrPosition.department),
    ]);

    const employeeCountByDepartment = new Map(
      employeeCounts.map((row) => [row.departmentId, row.count]),
    );
    const positionCountByDepartment = new Map(
      positionCounts.map((row) => [row.departmentId, row.count]),
    );

    return buildDepartmentTree(activeDepartments, {
      employeeCountByDepartment,
      positionCountByDepartment,
    });
  });
