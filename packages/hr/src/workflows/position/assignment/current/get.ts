import { hrPositionAssignment } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const ByPositionInputSchema = object({
  positionId: pipe(string(), minLength(1, "positionId is required")),
});

const ByEmployeeInputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

export const getCurrentAssignment = Workflow.name("hr.position.get-current-assignment")
  .input(ByPositionInputSchema)
  .handler(async (input, ctx) => {
    const { positionId } = input;

    return ctx.db
      .select()
      .from(hrPositionAssignment)
      .where(
        and(eq(hrPositionAssignment.position_id, positionId), isNull(hrPositionAssignment.to_date)),
      )
      .orderBy(desc(hrPositionAssignment.from_date));
  });

export const getCurrentPositions = Workflow.name("hr.position.get-current-positions")
  .input(ByEmployeeInputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    return ctx.db
      .select()
      .from(hrPositionAssignment)
      .where(
        and(eq(hrPositionAssignment.employee_id, employeeId), isNull(hrPositionAssignment.to_date)),
      )
      .orderBy(desc(hrPositionAssignment.from_date));
  });
