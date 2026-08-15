import { bankAccount } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const deactivateBankAccount = Workflow.name("bank-account.deactivate")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [updated] = await ctx.db
      .update(bankAccount)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(bankAccount.id, input.id))
      .returning();

    return updated;
  });
