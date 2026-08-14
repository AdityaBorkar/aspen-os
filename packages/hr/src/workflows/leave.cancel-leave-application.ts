import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveApplication } from "../db-schemas";
import {
  createLeaveLedgerEntry,
  fetchLeaveAllocationById,
  fetchLeaveApplicationById,
  updateLeaveAllocation,
} from "./utils";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const cancelLeaveApplication = Workflow.name("hr.leave.cancel-leave-application")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const application = await fetchLeaveApplicationById(ctx.db, id);

    // Revert leave allocation
    if (application.leaveAllocation) {
      const allocation = await fetchLeaveAllocationById(ctx.db, application.leaveAllocation);
      const newUsedDays = parseFloat(allocation.usedDays) - parseFloat(application.totalDays);

      await updateLeaveAllocation(ctx.db, allocation.id, {
        usedDays: Math.max(0, newUsedDays).toString(),
      });
    }

    // Create ledger entry
    await createLeaveLedgerEntry(ctx.db, {
      days: `-${application.totalDays}`,
      description: `Leave application cancelled`,
      employeeId: application.employeeId,
      leaveApplication: application.id,
      leaveType: application.leaveType,
      transactionType: "cancellation",
    });

    const [updated] = await ctx.db
      .update(leaveApplication)
      .set({
        cancelledAt: new Date(),
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(leaveApplication.id, id))
      .returning();

    return updated;
  });
