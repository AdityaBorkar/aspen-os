import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { leaveAllocation } from "../db-schemas";
import { CreateLeaveAllocationSchema } from "../types";
import { fetchLeavePeriodById, fetchLeaveTypeById } from "./utils";

const InputSchema = object({
  input: CreateLeaveAllocationSchema,
});

export const createLeaveAllocation = Workflow.name(
  "hr.leave.create-leave-allocation",
)
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeaveAllocationSchema, input);

    // Verify leave type exists
    await fetchLeaveTypeById(ctx.db, parsed.leaveType);

    // Verify leave period exists
    await fetchLeavePeriodById(ctx.db, parsed.leavePeriod);

    const [result] = await ctx.db
      .insert(leaveAllocation)
      .values({
        carryForwardedDays: parsed.carryForwardedDays ?? "0",
        earnedDays: parsed.earnedDays ?? "0",
        employeeId: parsed.employeeId,
        leavePeriod: parsed.leavePeriod,
        leavePolicyAssignment: parsed.leavePolicyAssignment ?? null,
        leaveType: parsed.leaveType,
        totalDays: parsed.totalDays,
        usedDays: parsed.usedDays ?? "0",
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create leave allocation.");
    }

    return result;
  });
