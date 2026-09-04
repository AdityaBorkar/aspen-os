import { leaveApplication } from "#/db-schemas";
import { assertUpdated, fetchLeaveApplicationById, requireStatus } from "#/workflows/fetch";
import { adjustAllocationUsage, insertLeaveLedgerEntry, toDays } from "#/workflows/leave-accounts";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveLeaveApplication = Workflow.name("hr.leave.approve-leave-application")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const application = await fetchLeaveApplicationById(ctx.db, id);
    requireStatus(application, ["draft", "pending"], `Leave application "${id}"`);

    const updated = await ctx.db.transaction(async (tx) => {
      if (application.leaveAllocation) {
        await adjustAllocationUsage(tx, application.leaveAllocation, {
          deltaDays: toDays(application.totalDays, "totalDays"),
          floorAtZero: false,
        });
      }

      await insertLeaveLedgerEntry(tx, {
        days: application.totalDays,
        description: `Leave application approved`,
        employeeId: application.employeeId,
        leaveApplication: application.id,
        leaveType: application.leaveType,
        transactionType: "application",
      });

      const [row] = await tx
        .update(leaveApplication)
        .set({
          approvedAt: new Date(),
          approvedBy,
          status: "approved",
          updatedAt: new Date(),
        })
        .where(eq(leaveApplication.id, id))
        .returning();

      return assertUpdated(row, `Leave application "${id}"`);
    });

    return updated;
  });
