import { leaveApplication } from "#/db-schemas";
import { assertUpdated, fetchLeaveApplicationById, requireStatus } from "#/workflows/fetch";
import { adjustAllocationUsage, insertLeaveLedgerEntry, toDays } from "#/workflows/leave-accounts";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const cancelLeaveApplication = Workflow.name("hr.leave.cancel-leave-application")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const application = await fetchLeaveApplicationById(ctx.db, id);
    requireStatus(application, ["draft", "pending", "approved"], `Leave application "${id}"`);

    const updated = await ctx.db.transaction(async (tx) => {
      // Only approved applications consumed allocation; cancelling a draft or
      // pending request must not move the balance.
      if (application.leaveAllocation && application.status === "approved") {
        await adjustAllocationUsage(tx, application.leaveAllocation, {
          deltaDays: -toDays(application.totalDays, "totalDays"),
          floorAtZero: true,
        });
      }

      await insertLeaveLedgerEntry(tx, {
        days: `-${application.totalDays}`,
        description: `Leave application cancelled`,
        employeeId: application.employeeId,
        leaveApplication: application.id,
        leaveType: application.leaveType,
        transactionType: "cancellation",
      });

      const [row] = await tx
        .update(leaveApplication)
        .set({
          cancelledAt: new Date(),
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(leaveApplication.id, id))
        .returning();

      return assertUpdated(row, `Leave application "${id}"`);
    });

    return updated;
  });
