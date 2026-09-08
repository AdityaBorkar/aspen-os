import { leaveBlockList } from "#/db-schemas";
import { CreateLeaveBlockListSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeaveBlockListSchema,
});

export const createLeaveBlockList = Workflow.name("hr.leave.create-leave-block-list")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(leaveBlockList)
      .values({
        company: parsed.company ?? null,
        department: parsed.department ?? null,
        from_date: parsed.fromDate,
        name: parsed.name,
        reason: parsed.reason ?? null,
        scope: parsed.scope,
        to_date: parsed.toDate,
      })
      .returning();

    return result;
  });
