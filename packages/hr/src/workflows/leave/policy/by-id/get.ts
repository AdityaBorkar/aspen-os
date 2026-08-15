import { leavePolicy } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getLeavePolicyById = Workflow.name("hr.leave.get-leave-policy-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db.select().from(leavePolicy).where(eq(leavePolicy.id, id)).limit(1);

    if (!result) {
      throw new Error(`Leave policy with id "${id}" not found.`);
    }

    return result;
  });
