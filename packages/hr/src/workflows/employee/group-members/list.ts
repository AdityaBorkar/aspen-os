import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeGroupMember } from "../../../db-schemas";

const InputSchema = object({
  groupId: pipe(string(), minLength(1, "groupId is required")),
});

export const listGroupMembers = Workflow.name("hr.employee.list-group-members")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { groupId } = input;

    return ctx.db
      .select()
      .from(employeeGroupMember)
      .where(eq(employeeGroupMember.groupId, groupId));
  });
