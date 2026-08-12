import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { bankAccount } from "../db-schemas";
import { UpdateBankAccountSchema } from "../types";
import { fetchBankAccountStep } from "./steps/fetch-bank-account";
import { unsetPrimaryBankAccount } from "./utils";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateBankAccountSchema,
});

export const updateBankAccount = Workflow.name("bank-account.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchBankAccountStep, { id: input.id });

    if (input.patch.isPrimary === true) {
      await unsetPrimaryBankAccount(ctx.db);
    }

    const [updated] = await ctx.db
      .update(bankAccount)
      .set({
        accountHolderName: input.patch.accountHolderName,
        accountNumber: input.patch.accountNumber,
        accountType: input.patch.accountType,
        bankName: input.patch.bankName,
        branchName: input.patch.branchName,
        currency: input.patch.currency,
        isActive: input.patch.isActive,
        isPrimary: input.patch.isPrimary,
        metadata: input.patch.metadata,
        routingNumber: input.patch.routingNumber,
        swiftCode: input.patch.swiftCode,
        updatedAt: new Date(),
      })
      .where(eq(bankAccount.id, input.id))
      .returning();

    return updated;
  });
