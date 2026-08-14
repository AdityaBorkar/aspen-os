import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { bankAccount } from "../../../db-schemas";
import { fetchBankAccountStep } from "../../../workflow-steps/fetch-bank-account";
import { unsetPrimaryBankAccount } from "../../utils";

export const setPrimary = Workflow.name("bank-account.set-primary")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchBankAccountStep, { id: input.id });
    await unsetPrimaryBankAccount(ctx.db);

    const [updated] = await ctx.db
      .update(bankAccount)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(bankAccount.id, input.id))
      .returning();

    return updated;
  });
