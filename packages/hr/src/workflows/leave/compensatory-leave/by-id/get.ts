import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { compensatoryLeaveRequest } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getCompensatoryLeaveById = Workflow.name("hr.leave.get-compensatory-leave-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(compensatoryLeaveRequest)
      .where(eq(compensatoryLeaveRequest.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Compensatory leave request with id "${id}" not found.`);
    }

    return result;
  });
