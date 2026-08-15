import { employeeGroupMember } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  groupId: pipe(string(), minLength(1, "groupId is required")),
});

export const removeGroupMember = Workflow.name("hr.employee.remove-group-member")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { groupId, employeeId } = input;

    const [deleted] = await ctx.db
      .delete(employeeGroupMember)
      .where(
        and(
          eq(employeeGroupMember.groupId, groupId),
          eq(employeeGroupMember.employeeId, employeeId),
        ),
      )
      .returning();

    return deleted;
  });
