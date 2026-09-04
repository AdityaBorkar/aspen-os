import { leavePeriod } from "#/db-schemas";
import { CreateLeavePeriodSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeavePeriodSchema,
});

export const createLeavePeriod = Workflow.name("hr.leave.create-leave-period")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(leavePeriod)
      .values({
        company: parsed.company ?? null,
        endDate: parsed.endDate,
        name: parsed.name,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  });
