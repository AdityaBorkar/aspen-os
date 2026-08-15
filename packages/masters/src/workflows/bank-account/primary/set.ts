import { masterBankAccount } from "#/db-schemas";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchBankAccountStep } from "#/workflow-steps/fetch-bank-account";
import { unsetPrimaryBankAccounts } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const setPrimaryBankAccount = Workflow.name("masters.bank-account.set-primary")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const bankAccount = await ctx.step.run(fetchBankAccountStep, { id: input.id });

    await ctx.step.run("unset-primary", () =>
      unsetPrimaryBankAccounts(ctx.db, bankAccount.entityType, bankAccount.entityId),
    );

    const [updated] = await ctx.db
      .update(masterBankAccount)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(masterBankAccount.id, input.id))
      .returning();

    await ctx.audit.write({
      action: AUDIT_ACTION.PRIMARY_SET,
      entityId: bankAccount.id,
      entityType: AUDIT_ENTITY_TYPE.BANK_ACCOUNT,
      metadata: { entityId: bankAccount.entityId, entityType: bankAccount.entityType },
    });

    return updated;
  });
