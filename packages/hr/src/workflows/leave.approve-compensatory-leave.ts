import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { compensatoryLeaveRequest } from "../db-schemas";
import {
  createLeaveAllocation,
  createLeaveLedgerEntry,
  fetchCompensatoryLeaveById,
} from "./utils";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveCompensatoryLeave = Workflow.name(
  "hr.leave.approve-compensatory-leave",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const request = await fetchCompensatoryLeaveById(ctx.db, id);

    // Create leave allocation for compensatory leave
    const allocation = await createLeaveAllocation(ctx.db, {
      carryForwardedDays: "0",
      employeeId: request.employeeId,
      leavePeriod: "", // Will need to be provided
      leaveType: request.leaveType,
      totalDays: request.numberOfDays,
    });

    // Create ledger entry
    await createLeaveLedgerEntry(ctx.db, {
      days: request.numberOfDays,
      description: `Compensatory leave approved for work on ${request.workDate}`,
      employeeId: request.employeeId,
      leaveType: request.leaveType,
      transactionType: "compensatory",
    });

    const [updated] = await ctx.db
      .update(compensatoryLeaveRequest)
      .set({
        approvedAt: new Date(),
        approvedBy,
        leaveAllocation: allocation.id,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(compensatoryLeaveRequest.id, id))
      .returning();

    return updated;
  });
