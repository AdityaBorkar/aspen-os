import { bankAccount } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchBankAccountStep = WorkflowStep.name("fetch-bank-account")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(bankAccount)
      .where(eq(bankAccount.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Bank account with id "${input.id}" not found.`);
    }

    return result;
  });
