import { employee, hrPosition, hrPositionAssignment } from "#/db-schemas";
import { buildPositionChainData, buildPositionTree } from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  company: optional(pipe(string(), minLength(1, "company is required"))),
});

export const getOrgTree = Workflow.name("hr.position.get-org-tree")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { company } = input;

    const employeeConditions = [eq(employee.status, "active")];
    if (company) {
      employeeConditions.push(eq(employee.company, company));
    }

    const [activeEmployees, positions, assignments] = await Promise.all([
      ctx.db
        .select({
          designation: employee.designation,
          firstName: employee.firstName,
          id: employee.id,
          image: employee.image,
          lastName: employee.lastName,
        })
        .from(employee)
        .where(and(...employeeConditions)),
      ctx.db.select().from(hrPosition).where(eq(hrPosition.isActive, true)),
      ctx.db.select().from(hrPositionAssignment).where(isNull(hrPositionAssignment.toDate)),
    ]);

    const employeeSet = new Set(activeEmployees.map((employeeItem) => employeeItem.id));
    const employeeById = new Map(
      activeEmployees.map((employeeItem) => [
        employeeItem.id,
        {
          designation: employeeItem.designation,
          image: employeeItem.image,
          name: `${employeeItem.firstName} ${employeeItem.lastName}`.trim(),
        },
      ]),
    );

    const filteredAssignments = assignments.filter((assignment) =>
      employeeSet.has(assignment.employeeId),
    );
    const chain = buildPositionChainData(positions, filteredAssignments);

    const positionById = new Map(positions.map((position) => [position.id, position]));
    const included = new Set<string>();
    const stack = [...chain.incumbentsByPosition.keys()];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || included.has(current)) {
        continue;
      }
      included.add(current);
      const parent = chain.parentByPosition.get(current);
      if (parent !== null && parent !== undefined && positionById.has(parent)) {
        stack.push(parent);
      }
    }

    const treePositions = positions.filter((position) => included.has(position.id));

    return buildPositionTree(treePositions, chain.incumbentsByPosition, employeeById);
  });
