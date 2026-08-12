import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveType } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getLeaveTypeById = Workflow.name("hr.leave.get-leave-type-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(leaveType)
      .where(eq(leaveType.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave type with id "${id}" not found.`);
    }

    return result;
  });
