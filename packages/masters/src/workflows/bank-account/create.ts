import { masterBankAccount } from "#/db-schemas";
import { BANK_ACCOUNT_EVENTS } from "#/pubsub";
import { CreateBankAccountSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { unsetPrimaryBankAccounts } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateBankAccountSchema });

export const createBankAccount = Workflow.name("masters.bank-account.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateBankAccountSchema, input);

    if (parsed.isPrimary) {
      await ctx.step.run("unset-primary", () =>
        unsetPrimaryBankAccounts(ctx.db, parsed.entityType, parsed.entityId),
      );
    }

    const [bankAccount] = await ctx.db
      .insert(masterBankAccount)
      .values({
        accountHolderName: parsed.accountHolderName,
        accountNumber: parsed.accountNumber,
        accountType: parsed.accountType ?? null,
        bankName: parsed.bankName,
        branchName: parsed.branchName ?? null,
        currency: parsed.currency,
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        isActive: parsed.isActive,
        isPrimary: parsed.isPrimary,
        metadata: parsed.metadata ?? null,
        routingNumber: parsed.routingNumber ?? null,
        swiftCode: parsed.swiftCode ?? null,
      })
      .returning();

    if (!bankAccount) {
      throw new Error("Failed to create bank account.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: bankAccount.id,
        entityType: AUDIT_ENTITY_TYPE.BANK_ACCOUNT,
        newState: {
          bankName: bankAccount.bankName,
          currency: bankAccount.currency,
          entityId: bankAccount.entityId,
          entityType: bankAccount.entityType,
          isActive: bankAccount.isActive,
          isPrimary: bankAccount.isPrimary,
        },
      });

      await ctx.pubsub.publish(BANK_ACCOUNT_EVENTS.CREATED, {
        bankAccount: {
          bankName: bankAccount.bankName,
          currency: bankAccount.currency,
          id: bankAccount.id,
        },
        entityId: bankAccount.entityId,
        entityType: bankAccount.entityType,
      });
    });

    return bankAccount;
  });
