import { bankAccount } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const activateBankAccount = Workflow.name("bank-account.activate")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [updated] = await ctx.db
      .update(bankAccount)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(bankAccount.id, input.id))
      .returning();

    return updated;
  });
