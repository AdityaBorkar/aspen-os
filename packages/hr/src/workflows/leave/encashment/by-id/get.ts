import { leaveEncashment } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getLeaveEncashmentById = Workflow.name("hr.leave.get-leave-encashment-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(leaveEncashment)
      .where(eq(leaveEncashment.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave encashment with id "${id}" not found.`);
    }

    return result;
  });
