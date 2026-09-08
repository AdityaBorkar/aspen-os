import { leaveAdjustment } from "#/db-schemas";
import { CreateLeaveAdjustmentSchema } from "#/types";
import { assertUpdated } from "#/workflows/fetch";
import { insertLeaveLedgerEntry } from "#/workflows/leave-accounts";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeaveAdjustmentSchema,
});

export const createLeaveAdjustment = Workflow.name("hr.leave.create-leave-adjustment")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const created = await ctx.db.transaction(async (tx) => {
      const ledgerEntry = await insertLeaveLedgerEntry(tx, {
        days: input.days,
        description: `Manual adjustment: ${input.reason}`,
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        transactionType: "adjustment",
      });

      const [row] = await tx
        .insert(leaveAdjustment)
        .values({
          adjusted_by: input.adjustedBy,
          days: input.days,
          employee_id: input.employeeId,
          leave_ledger_entry: ledgerEntry.id,
          leave_period: input.leavePeriod ?? null,
          leave_type: input.leaveType,
          reason: input.reason,
        })
        .returning();

      return assertUpdated(row, "Leave adjustment");
    });

    return created;
  });
