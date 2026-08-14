import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { bankAccount } from "../../db-schemas";
import { CreateBankAccountSchema } from "../../types";
import { unsetPrimaryBankAccount } from "../utils";

const CreateInputSchema = object({ input: CreateBankAccountSchema });

export const createBankAccount = Workflow.name("bank-account.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.isPrimary) {
      await unsetPrimaryBankAccount(ctx.db);
    }

    const [result] = await ctx.db
      .insert(bankAccount)
      .values({
        accountHolderName: input.accountHolderName,
        accountNumber: input.accountNumber,
        accountType: input.accountType ?? null,
        bankName: input.bankName,
        branchName: input.branchName ?? null,
        currency: input.currency ?? "USD",
        isActive: input.isActive ?? true,
        isPrimary: input.isPrimary ?? false,
        metadata: input.metadata ?? null,
        routingNumber: input.routingNumber ?? null,
        swiftCode: input.swiftCode ?? null,
      })
      .returning();

    return result;
  });
