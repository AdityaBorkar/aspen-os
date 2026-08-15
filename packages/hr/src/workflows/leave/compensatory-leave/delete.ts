import { compensatoryLeaveRequest } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteCompensatoryLeave = Workflow.name("hr.leave.delete-compensatory-leave")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(compensatoryLeaveRequest)
      .where(eq(compensatoryLeaveRequest.id, id))
      .returning();

    return deleted;
  });
