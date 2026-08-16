import { department, hrPosition } from "#/db-schemas";
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
        .where(eq(department.isActive, true));
      const childrenByParent = new Map<string | null, string[]>();
      for (const departmentItem of departments) {
        const siblings = childrenByParent.get(departmentItem.parentDepartment) ?? [];
        siblings.push(departmentItem.id);
        childrenByParent.set(departmentItem.parentDepartment, siblings);
      }

      const subtree = new Set<string>([departmentId]);
      const stack = [departmentId];
      while (stack.length > 0) {
        const current = stack.pop();
        if (current === undefined) {
          continue;
        }
        for (const childId of childrenByParent.get(current) ?? []) {
          if (!subtree.has(childId)) {
            subtree.add(childId);
            stack.push(childId);
          }
        }
      }
      departmentIds = [...subtree];
    }

    return ctx.db
      .select()
      .from(hrPosition)
      .where(and(eq(hrPosition.isActive, true), inArray(hrPosition.department, departmentIds)));
  });
