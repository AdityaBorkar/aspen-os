import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { leavePeriod } from "../../../db-schemas";
import { CreateLeavePeriodSchema } from "../../../types";

const InputSchema = object({
  input: CreateLeavePeriodSchema,
});

export const createLeavePeriod = Workflow.name("hr.leave.create-leave-period")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeavePeriodSchema, input);

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
