import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeSkillMap } from "../../../../db-schemas";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

export const listSkillMapByEmployee = Workflow.name("hr.employee.list-skill-map-by-employee")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    return ctx.db
      .select()
      .from(employeeSkillMap)
      .where(eq(employeeSkillMap.employeeId, employeeId));
  });
