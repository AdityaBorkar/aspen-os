import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { fullAndFinalStatement } from "../db-schemas";
import { CreateFullAndFinalSchema } from "../types";

const InputSchema = object({
  input: CreateFullAndFinalSchema,
});

export const createFullAndFinal = Workflow.name("hr.lifecycle.create-full-and-final")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFullAndFinalSchema, input);

    const [result] = await ctx.db
      .insert(fullAndFinalStatement)
      .values({
        bonus: parsed.bonus ?? "0",
        deductions: parsed.deductions ?? "0",
        employeeId: parsed.employeeId,
        gratuity: parsed.gratuity ?? "0",
        leaveEncashment: parsed.leaveEncashment ?? "0",
        loanRecovery: parsed.loanRecovery ?? "0",
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        pendingSalary: parsed.pendingSalary ?? "0",
        separationId: parsed.separationId ?? null,
      })
      .returning();

    return result;
  });
