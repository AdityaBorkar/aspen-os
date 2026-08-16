import { hrPositionAssignment } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

export const getEmployeePositionHistory = Workflow.name("hr.position.get-employee-position-history")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    return ctx.db
      .select()
      .from(hrPositionAssignment)
      .where(eq(hrPositionAssignment.employeeId, employeeId))
      .orderBy(desc(hrPositionAssignment.fromDate));
  });
