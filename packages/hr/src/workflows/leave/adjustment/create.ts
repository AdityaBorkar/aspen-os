import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { leaveAdjustment } from "../../../db-schemas";
import { CreateLeaveAdjustmentSchema } from "../../../types";
import { createLeaveLedgerEntry } from "../../utils";

const InputSchema = object({
  input: CreateLeaveAdjustmentSchema,
});

export const createLeaveAdjustment = Workflow.name("hr.leave.create-leave-adjustment")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeaveAdjustmentSchema, input);

    // Create ledger entry
    const ledgerEntry = await createLeaveLedgerEntry(ctx.db, {
      days: parsed.days,
      description: `Manual adjustment: ${parsed.reason}`,
      employeeId: parsed.employeeId,
      leaveType: parsed.leaveType,
      transactionType: "adjustment",
    });

    const [result] = await ctx.db
      .insert(leaveAdjustment)
      .values({
        adjustedBy: parsed.adjustedBy,
        days: parsed.days,
        employeeId: parsed.employeeId,
        leaveLedgerEntry: ledgerEntry.id,
        leavePeriod: parsed.leavePeriod ?? null,
        leaveType: parsed.leaveType,
        reason: parsed.reason,
      })
      .returning();

    return result;
  });
