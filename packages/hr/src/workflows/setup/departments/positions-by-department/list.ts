import { department, hrPosition } from "#/db-schemas";
import { collectSubtreeIds } from "#/workflows/trees";
import { fetchDepartmentById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { boolean, minLength, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  departmentId: pipe(string(), minLength(1, "departmentId is required")),
  includeSubtree: optional(boolean(), false),
});

export const listPositionsByDepartment = Workflow.name("hr.setup.list-positions-by-department")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { departmentId, includeSubtree } = input;

    await fetchDepartmentById(ctx.db, departmentId);

    let departmentIds = [departmentId];
    if (includeSubtree) {
      const departments = await ctx.db
        .select()
        .from(department)
        .where(eq(department.is_active, true));
      departmentIds = collectSubtreeIds(
        departments.map((departmentItem) => ({
          id: departmentItem.id,
          parentId: departmentItem.parent_department,
        })),
        [departmentId],
      );
    }

    return ctx.db
      .select()
      .from(hrPosition)
      .where(and(eq(hrPosition.is_active, true), inArray(hrPosition.department, departmentIds)));
  });
