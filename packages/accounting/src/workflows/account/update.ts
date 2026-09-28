import { accountingAccount, accountingGlEntry } from "#/db-schemas/chart";
import { UpdateAccountSchema } from "#/schemas/chart";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAccountStep } from "#/workflow-steps/fetch-account";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string(), patch: UpdateAccountSchema });

export const updateAccount = Workflow.name("accounting.account.update")
  .input(InputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const existing = await ctx.step.run(fetchAccountStep, { id });

    if (patch.rootType && patch.rootType !== existing.root_type) {
      const [child] = await ctx.db
        .select({ id: accountingAccount.id })
        .from(accountingAccount)
        .where(eq(accountingAccount.parent_id, id))
        .limit(1);
      if (child) {
        throw new Error("Cannot change root type while the account has children.");
      }
      const [posting] = await ctx.db
        .select({ id: accountingGlEntry.id })
        .from(accountingGlEntry)
        .where(eq(accountingGlEntry.account_id, id))
        .limit(1);
      if (posting) {
        throw new Error("Cannot change root type after postings exist.");
      }
    }

    if (patch.parentId !== undefined && patch.parentId !== existing.parent_id) {
      if (patch.parentId) {
        const [parent] = await ctx.db
          .select()
          .from(accountingAccount)
          .where(eq(accountingAccount.id, patch.parentId))
          .limit(1);
        if (!parent) {
          throw new Error(`Parent account "${patch.parentId}" not found.`);
        }
        if (!parent.is_group) {
          throw new Error("Ledger accounts cannot have children.");
        }
      }
      const [posting] = await ctx.db
        .select({ id: accountingGlEntry.id })
        .from(accountingGlEntry)
        .where(eq(accountingGlEntry.account_id, id))
        .limit(1);
      if (posting) {
        throw new Error("Cannot reparent an account with postings.");
      }
    }

    const [updated] = await ctx.db
      .update(accountingAccount)
      .set({
        account_number: patch.accountNumber ?? existing.account_number,
        account_type: patch.accountType ?? existing.account_type,
        is_disabled: patch.isDisabled ?? existing.is_disabled,
        name: patch.name ?? existing.name,
        parent_id: patch.parentId ?? existing.parent_id,
        root_type: patch.rootType ?? existing.root_type,
        updated_at: new Date(),
      })
      .where(eq(accountingAccount.id, id))
      .returning();

    const row = assertUpdated(updated, `Account "${id}"`);

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ACCOUNT,
        newState: { name: row.name },
        previousState: { name: existing.name },
      });
    });

    return row;
  });
