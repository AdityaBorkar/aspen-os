import { department, employee, hrPosition } from "#/db-schemas";
import { fetchDepartmentById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteDepartment = Workflow.name("hr.setup.delete-department")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    await fetchDepartmentById(ctx.db, id);

    const [children, activePositions, activeEmployees] = await Promise.all([
      ctx.db
        .select({ id: department.id })
        .from(department)
        .where(and(eq(department.parent_department, id), eq(department.is_active, true)))
        .limit(1),
      ctx.db
        .select({ id: hrPosition.id })
        .from(hrPosition)
        .where(and(eq(hrPosition.department, id), eq(hrPosition.is_active, true)))
        .limit(1),
      ctx.db
        .select({ id: employee.id })
        .from(employee)
        .where(and(eq(employee.department, id), eq(employee.status, "active")))
        .limit(1),
    ]);

    if (children.length > 0) {
      throw new Error(`Department "${id}" has child departments and cannot be deleted.`);
    }
    if (activePositions.length > 0) {
      throw new Error(`Department "${id}" has active positions and cannot be deleted.`);
    }
    if (activeEmployees.length > 0) {
      throw new Error(`Department "${id}" has active employees and cannot be deleted.`);
    }

    const [updated] = await ctx.db
      .update(department)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(department.id, id))
      .returning();

    return updated;
  });
