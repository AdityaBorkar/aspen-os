import { masterBankAccount } from "#/db-schemas";
import { BANK_ACCOUNT_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchBankAccountStep } from "#/workflow-steps/fetch-bank-account";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deactivateBankAccount = Workflow.name("masters.bank-account.deactivate")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchBankAccountStep, { id: input.id });

    if (!current.isActive) {
      return current;
    }

    const [updated] = await ctx.db
      .update(masterBankAccount)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(masterBankAccount.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Bank account with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DEACTIVATED,
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.BANK_ACCOUNT,
      });

      await ctx.pubsub.publish(BANK_ACCOUNT_EVENTS.DEACTIVATED, {
        bankAccountId: updated.id,
      });
    });

    return updated;
  });
