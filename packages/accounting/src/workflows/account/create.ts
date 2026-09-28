import { accountingAccount } from "#/db-schemas/chart";
import { CreateAccountSchema } from "#/schemas/chart";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateAccountSchema });

export const createAccount = Workflow.name("accounting.account.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAccountSchema, input);

    await ctx.step.run("validate", async () => {
      if (parsed.parentId) {
        const [parent] = await ctx.db
          .select()
          .from(accountingAccount)
          .where(eq(accountingAccount.id, parsed.parentId))
          .limit(1);
        if (!parent) {
          throw new Error(`Parent account "${parsed.parentId}" not found.`);
        }
        if (!parent.is_group) {
          throw new Error("Ledger accounts cannot have children. Parent must be a group.");
        }
        if (parent.root_type !== parsed.rootType) {
          throw new Error("Child account must share the parent root type.");
        }
      }
      if (!parsed.isGroup) {
        const [sibling] = await ctx.db
          .select({ id: accountingAccount.id })
          .from(accountingAccount)
          .where(
            and(
              eq(accountingAccount.name, parsed.name),
              parsed.parentId
                ? eq(accountingAccount.parent_id, parsed.parentId)
                : eq(accountingAccount.parent_id, ""),
            ),
          )
          .limit(1);
        if (sibling) {
          throw new Error(`Account "${parsed.name}" already exists under this parent.`);
        }
      }
    });

    const [row] = await ctx.db
      .insert(accountingAccount)
      .values({
        account_number: parsed.accountNumber ?? null,
        account_type: parsed.accountType,
        is_group: parsed.isGroup ?? false,
        name: parsed.name,
        parent_id: parsed.parentId ?? null,
        root_type: parsed.rootType,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create account.");
    }

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ACCOUNT,
        newState: { accountType: row.account_type, name: row.name, rootType: row.root_type },
      });
    });

    return row;
  });
