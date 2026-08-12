import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { leavePolicyDetail } from "../db-schemas";
import { CreateLeavePolicyDetailSchema } from "../types";
import { fetchLeavePolicyById, fetchLeaveTypeById } from "./utils";

const InputSchema = object({
  input: CreateLeavePolicyDetailSchema,
});

export const createLeavePolicyDetail = Workflow.name(
  "hr.leave.create-leave-policy-detail",
)
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeavePolicyDetailSchema, input);

    // Verify leave policy exists
    await fetchLeavePolicyById(ctx.db, parsed.leavePolicyId);

    // Verify leave type exists
    await fetchLeaveTypeById(ctx.db, parsed.leaveType);

    const [result] = await ctx.db
      .insert(leavePolicyDetail)
      .values({
        carryForwardDays: parsed.carryForwardDays ?? 0,
        leavePolicyId: parsed.leavePolicyId,
        leaveType: parsed.leaveType,
        maxDays: parsed.maxDays,
      })
      .returning();

    return result;
  });
