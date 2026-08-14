import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leavePolicyDetail } from "../../../db-schemas";

const InputSchema = object({
  leavePolicyId: pipe(string(), minLength(1, "leavePolicyId is required")),
});

export const listLeavePolicyDetails = Workflow.name("hr.leave.list-leave-policy-details")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { leavePolicyId } = input;

    return ctx.db
      .select()
      .from(leavePolicyDetail)
      .where(eq(leavePolicyDetail.leavePolicyId, leavePolicyId));
  });
