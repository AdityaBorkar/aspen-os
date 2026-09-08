import { fullAndFinalStatement } from "#/db-schemas";
import { toDays } from "#/workflows/leave-accounts";
import { assertUpdated, fetchFullAndFinalById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveFullAndFinal = Workflow.name("hr.lifecycle.approve-full-and-final")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const statement = await fetchFullAndFinalById(ctx.db, id);
    requireStatus(statement, ["draft", "pending"], `Full and final statement "${id}"`);

    // Calculate totals
    const totalEarnings =
      toDays(statement.pending_salary, "pendingSalary") +
      toDays(statement.leave_encashment, "leaveEncashment") +
      toDays(statement.bonus, "bonus") +
      toDays(statement.gratuity, "gratuity");

    const totalDeductions =
      toDays(statement.loan_recovery, "loanRecovery") + toDays(statement.deductions, "deductions");

    const netPayable = totalEarnings - totalDeductions;

    const [updated] = await ctx.db
      .update(fullAndFinalStatement)
      .set({
        approved_at: new Date(),
        approved_by: approvedBy,
        net_payable: netPayable.toString(),
        status: "approved",
        total_deductions: totalDeductions.toString(),
        total_earnings: totalEarnings.toString(),
        updated_at: new Date(),
      })
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return assertUpdated(updated, `Full and final statement "${id}"`);
  });
