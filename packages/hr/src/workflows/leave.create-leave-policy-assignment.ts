import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { leavePolicyAssignment } from "../db-schemas";
import { CreateLeavePolicyAssignmentSchema } from "../types";
import { fetchLeavePeriodById, fetchLeavePolicyById } from "./utils";

const InputSchema = object({
  input: CreateLeavePolicyAssignmentSchema,
});

export const createLeavePolicyAssignment = Workflow.name("hr.leave.create-leave-policy-assignment")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeavePolicyAssignmentSchema, input);

    // Verify leave policy exists
    await fetchLeavePolicyById(ctx.db, parsed.leavePolicy);

    // Verify leave period exists
    await fetchLeavePeriodById(ctx.db, parsed.leavePeriod);

    const [result] = await ctx.db
      .insert(leavePolicyAssignment)
      .values({
        effectiveFrom: parsed.effectiveFrom,
        effectiveTo: parsed.effectiveTo ?? null,
        employeeId: parsed.employeeId,
        leavePeriod: parsed.leavePeriod,
        leavePolicy: parsed.leavePolicy,
      })
      .returning();

    return result;
  });
