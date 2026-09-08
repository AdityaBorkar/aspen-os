import { masterBankAccount } from "#/db-schemas";
import { BANK_ACCOUNT_EVENTS } from "#/pubsub";
import { UpdateBankAccountSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchBankAccountStep } from "#/workflow-steps/fetch-bank-account";
import { unsetPrimaryForOwner } from "#/workflows/utils";

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
        unsetPrimaryForOwner({
          db: ctx.db,
          entityId: current.entity_id,
          entityType: current.entity_type,
          table: masterBankAccount,
        }),
      );
    }

    const updates = stripUndefined({
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
    });

    const [updated] = await ctx.db
      .update(masterBankAccount)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(masterBankAccount.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Bank account with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.BANK_ACCOUNT,
      });

      await ctx.pubsub.publish(BANK_ACCOUNT_EVENTS.UPDATED, {
        bankAccount: { id: updated.id },
        changes: updates,
        entityId: updated.entity_id,
        entityType: updated.entity_type,
      });
    });

    return updated;
  });
