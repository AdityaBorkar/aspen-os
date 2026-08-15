import { masterBankAccount } from "#/db-schemas";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchBankAccountStep } from "#/workflow-steps/fetch-bank-account";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deleteBankAccount = Workflow.name("masters.bank-account.delete")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchBankAccountStep, { id: input.id });

    await ctx.db.delete(masterBankAccount).where(eq(masterBankAccount.id, input.id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.BANK_ACCOUNT,
        metadata: { entityId: current.entityId, entityType: current.entityType },
      });
    });

    return { removed: true };
  });
