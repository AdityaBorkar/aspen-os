import { compensatoryLeaveRequest } from "#/db-schemas";
import {
  assertUpdated,
  fetchCompensatoryLeaveById,
  fetchLeavePeriodById,
  requireStatus,
} from "#/workflows/fetch";
import { insertLeaveAllocation, insertLeaveLedgerEntry } from "#/workflows/leave-accounts";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
  leavePeriod: pipe(string(), minLength(1, "leavePeriod is required")),
});

export const approveCompensatoryLeave = Workflow.name("hr.leave.approve-compensatory-leave")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy, leavePeriod } = input;

    const request = await fetchCompensatoryLeaveById(ctx.db, id);
    requireStatus(request, "pending", `Compensatory leave request "${id}"`);
    await fetchLeavePeriodById(ctx.db, leavePeriod);

    const updated = await ctx.db.transaction(async (tx) => {
      const allocation = await insertLeaveAllocation(tx, {
        carryForwardedDays: "0",
        employeeId: request.employee_id,
        leavePeriod,
        leaveType: request.leave_type,
        totalDays: request.number_of_days,
      });

      await insertLeaveLedgerEntry(tx, {
        days: request.number_of_days,
        description: `Compensatory leave approved for work on ${request.work_date}`,
        employeeId: request.employee_id,
        leaveType: request.leave_type,
        transactionType: "compensatory",
      });

      const [row] = await tx
        .update(compensatoryLeaveRequest)
        .set({
          approved_at: new Date(),
          approved_by: approvedBy,
          leave_allocation: allocation.id,
          status: "approved",
          updated_at: new Date(),
        })
        .where(eq(compensatoryLeaveRequest.id, id))
        .returning();

      return assertUpdated(row, `Compensatory leave request "${id}"`);
    });

    return updated;
  });
