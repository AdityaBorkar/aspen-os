import { leaveLedgerEntry } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  leaveType: optional(pipe(string(), minLength(1, "leaveType is required"))),
});

export const listLedgerEntries = Workflow.name("hr.leave.list-ledger-entries")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId, leaveType } = input;

    const conditions = [eq(leaveLedgerEntry.employeeId, employeeId)];
    if (leaveType) {
      conditions.push(eq(leaveLedgerEntry.leaveType, leaveType));
    }

    return ctx.db
      .select()
      .from(leaveLedgerEntry)
      .where(and(...conditions));
  });
