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
      if (application.leave_allocation && application.status === "approved") {
        await adjustAllocationUsage(tx, application.leave_allocation, {
          deltaDays: -toDays(application.total_days, "totalDays"),
          floorAtZero: true,
        });
      }

      await insertLeaveLedgerEntry(tx, {
        days: `-${application.total_days}`,
        description: `Leave application cancelled`,
        employeeId: application.employee_id,
        leaveApplication: application.id,
        leaveType: application.leave_type,
        transactionType: "cancellation",
      });

      const [row] = await tx
        .update(leaveApplication)
        .set({
          cancelled_at: new Date(),
          status: "cancelled",
          updated_at: new Date(),
        })
        .where(eq(leaveApplication.id, id))
        .returning();

      return assertUpdated(row, `Leave application "${id}"`);
    });

    return updated;
  });
