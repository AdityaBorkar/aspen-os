import { department, employee, hrPosition } from "#/db-schemas";
import { buildDepartmentTree, fetchDepartmentById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { count, eq } from "drizzle-orm";
import { minLength, number, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  depth: optional(number()),
  id: pipe(string(), minLength(1, "id is required")),
});

export const getDepartmentSubtree = Workflow.name("hr.setup.get-department-subtree")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, depth } = input;

    await fetchDepartmentById(ctx.db, id);

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

    return buildDepartmentTree(
      activeDepartments,
      {
        employeeCountByDepartment,
        positionCountByDepartment,
      },
      { depth, rootIds: new Set([id]) },
    );
  });
