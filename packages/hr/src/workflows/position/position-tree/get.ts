import { employee, hrPosition, hrPositionAssignment } from "#/db-schemas";
import {
  fetchPositionById,
  buildPositionChainData,
  buildPositionTree,
} from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq, isNull } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  positionId: optional(pipe(string(), minLength(1, "positionId is required"))),
});

export const getPositionTree = Workflow.name("hr.position.get-position-tree")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { positionId } = input;

    if (positionId) {
      await fetchPositionById(ctx.db, positionId);
    }

    const [positions, assignments, activeEmployees] = await Promise.all([
      ctx.db.select().from(hrPosition).where(eq(hrPosition.isActive, true)),
      ctx.db.select().from(hrPositionAssignment).where(isNull(hrPositionAssignment.toDate)),
      ctx.db
        .select({
          designation: employee.designation,
          firstName: employee.firstName,
          id: employee.id,
          image: employee.image,
          lastName: employee.lastName,
        })
        .from(employee)
        .where(eq(employee.status, "active")),
    ]);

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

    const chain = buildPositionChainData(positions, assignments);

    const treePositions = positionId ? collectSubtreePositions(positions, positionId) : positions;

    return buildPositionTree(treePositions, chain.incumbentsByPosition, employeeById);
  });

function collectSubtreePositions<
  TPosition extends { id: string; reportsToPosition: string | null },
>(positions: TPosition[], rootPositionId: string): TPosition[] {
  const childrenByParent = new Map<string | null, string[]>();
  for (const position of positions) {
    const siblings = childrenByParent.get(position.reportsToPosition) ?? [];
    siblings.push(position.id);
    childrenByParent.set(position.reportsToPosition, siblings);
  }

  const included = new Set<string>([rootPositionId]);
  const stack = [rootPositionId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!included.has(childId)) {
        included.add(childId);
        stack.push(childId);
      }
    }
  }

  return positions.filter((position) => included.has(position.id));
}
