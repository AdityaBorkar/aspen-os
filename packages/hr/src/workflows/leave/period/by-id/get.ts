import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leavePeriod } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getLeavePeriodById = Workflow.name("hr.leave.get-leave-period-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db.select().from(leavePeriod).where(eq(leavePeriod.id, id)).limit(1);

    if (!result) {
      throw new Error(`Leave period with id "${id}" not found.`);
    }

    return result;
  });
