import { masterBankAccount } from "#/db-schemas";
import { BANK_ACCOUNT_EVENTS } from "#/pubsub";
import { UpdateBankAccountSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchBankAccountStep } from "#/workflow-steps/fetch-bank-account";
import { unsetPrimaryBankAccounts } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateBankAccountSchema,
});

export const updateBankAccount = Workflow.name("masters.bank-account.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchBankAccountStep, { id: input.id });

    if (input.patch.isPrimary === true) {
      await ctx.step.run("unset-primary", () =>
        unsetPrimaryBankAccounts(ctx.db, current.entityType, current.entityId),
      );
    }

    const [updated] = await ctx.db
      .update(masterBankAccount)
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
      .where(eq(masterBankAccount.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Bank account with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: input.patch,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.BANK_ACCOUNT,
      });

      await ctx.pubsub.publish(BANK_ACCOUNT_EVENTS.UPDATED, {
        bankAccount: { id: updated.id },
        changes: input.patch,
        entityId: updated.entityId,
        entityType: updated.entityType,
      });
    });

    return updated;
  });
