import { accountingAccount, accountingGlEntry } from "#/db-schemas/chart";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAccountStep } from "#/workflow-steps/fetch-account";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const disableAccount = Workflow.name("accounting.account.disable")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await ctx.step.run(fetchAccountStep, { id });

    if (existing.is_group) {
      const [child] = await ctx.db
        .select({ id: accountingAccount.id })
        .from(accountingAccount)
        .where(eq(accountingAccount.parent_id, id))
        .limit(1);
      if (child) {
        const [posting] = await ctx.db
          .select({ id: accountingGlEntry.id })
          .from(accountingGlEntry)
          .where(eq(accountingGlEntry.account_id, id))
          .limit(1);
        if (posting) {
          throw new Error(
            "Disable the account history is preserved; group with history cannot be deleted.",
          );
        }
      }
    }

    const [updated] = await ctx.db
      .update(accountingAccount)
      .set({ is_disabled: true, updated_at: new Date() })
      .where(eq(accountingAccount.id, id))
      .returning();

    const row = assertUpdated(updated, `Account "${id}"`);

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ACCOUNT,
        newState: { isDisabled: true },
      });
    });

    return row;
  });
