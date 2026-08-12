import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeGroup, employeeGroupMember } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteGroup = Workflow.name("hr.employee.delete-group")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    // Remove all members first
    await ctx.db
      .delete(employeeGroupMember)
      .where(eq(employeeGroupMember.groupId, id));

    const [deleted] = await ctx.db
      .delete(employeeGroup)
      .where(eq(employeeGroup.id, id))
      .returning();

    return deleted;
  });
