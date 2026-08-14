import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { bankAccount } from "../../db-schemas";

export const deleteBankAccount = Workflow.name("bank-account.delete")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    await ctx.db.delete(bankAccount).where(eq(bankAccount.id, input.id));
  });
