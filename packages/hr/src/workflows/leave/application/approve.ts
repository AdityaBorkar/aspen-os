import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveApplication } from "../../../db-schemas";
import {
  createLeaveLedgerEntry,
  fetchLeaveAllocationById,
  fetchLeaveApplicationById,
  updateLeaveAllocation,
} from "../../utils";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveLeaveApplication = Workflow.name("hr.leave.approve-leave-application")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const application = await fetchLeaveApplicationById(ctx.db, id);

    // Update leave allocation
    if (application.leaveAllocation) {
      const allocation = await fetchLeaveAllocationById(ctx.db, application.leaveAllocation);
      const newUsedDays = parseFloat(allocation.usedDays) + parseFloat(application.totalDays);

      await updateLeaveAllocation(ctx.db, allocation.id, {
        usedDays: newUsedDays.toString(),
      });
    }

    // Create ledger entry
    await createLeaveLedgerEntry(ctx.db, {
      days: application.totalDays,
      description: `Leave application approved`,
      employeeId: application.employeeId,
      leaveApplication: application.id,
      leaveType: application.leaveType,
      transactionType: "application",
    });

    const [updated] = await ctx.db
      .update(leaveApplication)
      .set({
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(leaveApplication.id, id))
      .returning();

    return updated;
  });
