import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveApplication } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteLeaveApplication = Workflow.name("hr.leave.delete-leave-application")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(leaveApplication)
      .where(eq(leaveApplication.id, id))
      .returning();

    return deleted;
  });
