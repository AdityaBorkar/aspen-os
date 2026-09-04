import { employeeGroup, employeeGroupMember } from "#/db-schemas";
import { assertUpdated } from "#/workflows/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteGroup = Workflow.name("hr.employee.delete-group")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const deleted = await ctx.db.transaction(async (tx) => {
      await tx.delete(employeeGroupMember).where(eq(employeeGroupMember.groupId, id));

      const [row] = await tx.delete(employeeGroup).where(eq(employeeGroup.id, id)).returning();

      return assertUpdated(row, `Employee group "${id}"`);
    });

    return deleted;
  });
