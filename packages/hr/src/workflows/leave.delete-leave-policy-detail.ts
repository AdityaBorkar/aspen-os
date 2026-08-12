import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leavePolicyDetail } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteLeavePolicyDetail = Workflow.name(
  "hr.leave.delete-leave-policy-detail",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(leavePolicyDetail)
      .where(eq(leavePolicyDetail.id, id))
      .returning();

    return deleted;
  });
