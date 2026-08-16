import { employee, hrPosition, hrPositionAssignment } from "#/db-schemas";
import { buildEmployeeTree } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

const ChartFiltersSchema = object({
  branch: optional(string()),
  department: optional(string()),
  position: optional(string()),
});

const InputSchema = object({
  company: optional(pipe(string(), minLength(1, "company is required"))),
  filters: optional(ChartFiltersSchema),
});

export const getOrganizationalChart = Workflow.name("hr.employee.get-organizational-chart")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { company, filters } = input;

    const employeeConditions = [eq(employee.status, "active")];
    if (company) {
      employeeConditions.push(eq(employee.company, company));
    }
    if (filters?.department) {
      employeeConditions.push(eq(employee.department, filters.department));
    }
    if (filters?.branch) {
      employeeConditions.push(eq(employee.branch, filters.branch));
    }

    const [allEmployees, assignments] = await Promise.all([
      ctx.db
        .select({
          department: employee.department,
          designation: employee.designation,
          firstName: employee.firstName,
          id: employee.id,
          image: employee.image,
          lastName: employee.lastName,
          reportsTo: employee.reportsTo,
        })
        .from(employee)
        .where(and(...employeeConditions)),
      ctx.db
        .select({
          employeeId: hrPositionAssignment.employeeId,
          isPrimary: hrPositionAssignment.isPrimary,
          positionId: hrPositionAssignment.positionId,
        })
        .from(hrPositionAssignment)
        .where(isNull(hrPositionAssignment.toDate)),
    ]);

    let employees = allEmployees;
    if (filters?.position) {
      const assigned = new Set(
        assignments
          .filter((assignment) => assignment.positionId === filters.position)
          .map((assignment) => assignment.employeeId),
      );
      employees = allEmployees.filter((employeeItem) => assigned.has(employeeItem.id));
    }

    const positionIdSet = new Set(assignments.map((assignment) => assignment.positionId));
    const positionNameById = new Map<string, string>();
    if (positionIdSet.size > 0) {
      const positions = await ctx.db
        .select({ id: hrPosition.id, name: hrPosition.name })
        .from(hrPosition)
        .where(inArray(hrPosition.id, [...positionIdSet]));
      for (const position of positions) {
        positionNameById.set(position.id, position.name);
      }
    }

    const sortedAssignments = [...assignments].toSorted(
      (left, right) => Number(right.isPrimary) - Number(left.isPrimary),
    );
    const positionByEmployee = new Map<string, string>();
    for (const assignment of sortedAssignments) {
      if (positionByEmployee.has(assignment.employeeId)) {
        continue;
      }
      positionByEmployee.set(
        assignment.employeeId,
        positionNameById.get(assignment.positionId) ?? assignment.positionId,
      );
    }

    const projected: Parameters<typeof buildEmployeeTree>[0] = [];
    for (const employeeItem of employees) {
      projected.push({
        ...employeeItem,
        position: positionByEmployee.get(employeeItem.id) ?? null,
      });
    }

    return buildEmployeeTree(projected, null);
  });
