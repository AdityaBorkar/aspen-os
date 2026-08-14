import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrUser } from "../../../../db-schemas";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

export const getUserByEmployeeId = Workflow.name("hr.access.get-user-by-employee-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    const [record] = await ctx.db
      .select()
      .from(hrUser)
      .where(eq(hrUser.employeeId, employeeId))
      .limit(1);
    return record ?? null;
  });
