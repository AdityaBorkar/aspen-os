import { fullAndFinalStatement } from "#/db-schemas";
import { CreateFullAndFinalSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateFullAndFinalSchema,
});

export const createFullAndFinal = Workflow.name("hr.lifecycle.create-full-and-final")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(fullAndFinalStatement)
      .values({
        bonus: parsed.bonus ?? "0",
        deductions: parsed.deductions ?? "0",
        employee_id: parsed.employeeId,
        gratuity: parsed.gratuity ?? "0",
        leave_encashment: parsed.leaveEncashment ?? "0",
        loan_recovery: parsed.loanRecovery ?? "0",
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        pending_salary: parsed.pendingSalary ?? "0",
        separation_id: parsed.separationId ?? null,
      })
      .returning();

    return result;
  });
