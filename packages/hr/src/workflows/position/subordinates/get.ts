import { employee } from "#/db-schemas";
import { resolveManagerIdMap } from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, number, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  depth: optional(number()),
  managerId: pipe(string(), minLength(1, "managerId is required")),
});

export const getSubordinates = Workflow.name("hr.position.get-subordinates")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { managerId, depth } = input;

    const employees = await ctx.db.select().from(employee).where(eq(employee.status, "active"));
    const managerMap = await resolveManagerIdMap(ctx.db, employees);

    const employeeById = new Map(employees.map((employeeItem) => [employeeItem.id, employeeItem]));
    const childrenByManager = new Map<string, string[]>();
    for (const employeeItem of employees) {
      const manager = managerMap.get(employeeItem.id);
      if (manager) {
        const children = childrenByManager.get(manager) ?? [];
        children.push(employeeItem.id);
        childrenByManager.set(manager, children);
      }
    }

    const result: (typeof employees)[number][] = [];
    const seen = new Set<string>([managerId]);
    let frontier = [managerId];
    let remainingLevels = depth;

    while (frontier.length > 0 && (remainingLevels === undefined || remainingLevels > 0)) {
      const next: string[] = [];
      for (const manager of frontier) {
        for (const childId of childrenByManager.get(manager) ?? []) {
          if (!seen.has(childId)) {
            seen.add(childId);
            const child = employeeById.get(childId);
            if (child) {
              result.push(child);
            }
            next.push(childId);
          }
        }
      }
      frontier = next;
      if (remainingLevels !== undefined) {
        remainingLevels -= 1;
      }
    }

    return result;
  });
