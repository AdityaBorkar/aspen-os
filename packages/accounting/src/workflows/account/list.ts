import { accountingAccount } from "#/db-schemas/chart";
import { AccountFiltersSchema } from "#/schemas/chart";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const InputSchema = AccountFiltersSchema;

export const listAccounts = Workflow.name("accounting.account.list")
  .input(InputSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.rootType) {
        conditions.push(eq(accountingAccount.root_type, input.rootType));
      }
      if (input.accountType) {
        conditions.push(eq(accountingAccount.account_type, input.accountType));
      }
      if (input.parentId) {
        conditions.push(eq(accountingAccount.parent_id, input.parentId));
      }
      if (!input.includeDisabled) {
        conditions.push(eq(accountingAccount.is_disabled, false));
      }
      return ctx.db
        .select()
        .from(accountingAccount)
        .where(and(...conditions))
        .orderBy(asc(accountingAccount.name));
    }),
  );
