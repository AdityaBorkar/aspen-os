import { masterBankAccount } from "#/db-schemas";
import { BANK_ACCOUNT_EVENTS } from "#/pubsub";
import { CreateBankAccountSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { unsetPrimaryForOwner } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateBankAccountSchema });

export const createBankAccount = Workflow.name("masters.bank-account.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateBankAccountSchema, input);

    if (parsed.isPrimary) {
      await ctx.step.run("unset-primary", () =>
        unsetPrimaryForOwner({
          db: ctx.db,
          entityId: parsed.entityId,
          entityType: parsed.entityType,
          table: masterBankAccount,
        }),
      );
    }

    const [bankAccount] = await ctx.db
      .insert(masterBankAccount)
      .values({
        account_holder_name: parsed.accountHolderName,
        account_number: parsed.accountNumber,
        account_type: parsed.accountType ?? null,
        bank_name: parsed.bankName,
        branch_name: parsed.branchName ?? null,
        currency: parsed.currency,
        entity_id: parsed.entityId,
        entity_type: parsed.entityType,
        is_active: parsed.isActive,
        is_primary: parsed.isPrimary,
        metadata: parsed.metadata ?? null,
        routing_number: parsed.routingNumber ?? null,
        swift_code: parsed.swiftCode ?? null,
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
          bankName: bankAccount.bank_name,
          currency: bankAccount.currency,
          entityId: bankAccount.entity_id,
          entityType: bankAccount.entity_type,
          isActive: bankAccount.is_active,
          isPrimary: bankAccount.is_primary,
        },
      });

      await ctx.pubsub.publish(BANK_ACCOUNT_EVENTS.CREATED, {
        bankAccount: {
          bankName: bankAccount.bank_name,
          currency: bankAccount.currency,
          id: bankAccount.id,
        },
        entityId: bankAccount.entity_id,
        entityType: bankAccount.entity_type,
      });
    });

    return bankAccount;
  });
