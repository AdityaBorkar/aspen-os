import { fullAndFinalStatement } from "#/db-schemas";
import { fetchFullAndFinalById } from "#/workflows/utils";

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

    // Calculate totals
    const totalEarnings =
      parseFloat(statement.pendingSalary) +
      parseFloat(statement.leaveEncashment) +
      parseFloat(statement.bonus) +
      parseFloat(statement.gratuity);

    const totalDeductions = parseFloat(statement.loanRecovery) + parseFloat(statement.deductions);

    const netPayable = totalEarnings - totalDeductions;

    const [updated] = await ctx.db
      .update(fullAndFinalStatement)
      .set({
        approvedAt: new Date(),
        approvedBy,
        netPayable: netPayable.toString(),
        status: "approved",
        totalDeductions: totalDeductions.toString(),
        totalEarnings: totalEarnings.toString(),
        updatedAt: new Date(),
      })
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return updated;
  });
