import { masterBankAccount } from "#/db-schemas";
import { ListBankAccountsSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const listBankAccounts = Workflow.name("masters.bank-account.list")
  .input(ListBankAccountsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [
        eq(masterBankAccount.entity_type, input.entityType),
        eq(masterBankAccount.entity_id, input.entityId),
      ];

      if (parsed.currency) {
        conditions.push(eq(masterBankAccount.currency, parsed.currency));
      }
      if (parsed.isActive !== undefined) {
        conditions.push(eq(masterBankAccount.is_active, parsed.isActive));
      }
      if (parsed.isPrimary !== undefined) {
        conditions.push(eq(masterBankAccount.is_primary, parsed.isPrimary));
      }

      return ctx.db
        .select()
        .from(masterBankAccount)
        .where(and(...conditions));
    }),
  );
