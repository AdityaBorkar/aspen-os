import { employee, hrPosition, hrPositionAssignment } from "#/db-schemas";
import { buildPositionChainData } from "#/utils/position-utils";
import { fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq, isNull } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

export const getTeam = Workflow.name("hr.position.get-team")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    await fetchEmployeeById(ctx.db, employeeId);

    const [positions, assignments, activeEmployees] = await Promise.all([
      ctx.db.select().from(hrPosition).where(eq(hrPosition.isActive, true)),
      ctx.db.select().from(hrPositionAssignment).where(isNull(hrPositionAssignment.toDate)),
      ctx.db.select().from(employee).where(eq(employee.status, "active")),
    ]);

    const chain = buildPositionChainData(positions, assignments);

    const employeePositions = new Map<string, string[]>();
    for (const assignment of assignments) {
      const list = employeePositions.get(assignment.employeeId) ?? [];
      list.push(assignment.positionId);
      employeePositions.set(assignment.employeeId, list);
    }

    const childrenByParent = new Map<string | null, string[]>();
    for (const position of positions) {
      const siblings = childrenByParent.get(position.reportsToPosition) ?? [];
      siblings.push(position.id);
      childrenByParent.set(position.reportsToPosition, siblings);
    }

    const teamPositions = new Set<string>();
    const stack = [...(employeePositions.get(employeeId) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || teamPositions.has(current)) {
        continue;
      }
      teamPositions.add(current);
      for (const childId of childrenByParent.get(current) ?? []) {
        stack.push(childId);
      }
    }

    const teamEmployeeIds = new Set<string>([employeeId]);
    for (const positionId of teamPositions) {
      for (const memberId of chain.incumbentsByPosition.get(positionId) ?? []) {
        teamEmployeeIds.add(memberId);
      }
    }

    return activeEmployees.filter((employeeItem) => teamEmployeeIds.has(employeeItem.id));
  });
