import { bankAccount } from "#/db-schemas";
import { BankAccountFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

export const listBankAccounts = Workflow.name("bank-account.list")
  .input(object({ filters: optional(BankAccountFiltersSchema) }))
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [];

      if (parsed.currency) {
        conditions.push(eq(bankAccount.currency, parsed.currency));
      }
      if (parsed.isActive !== undefined) {
        conditions.push(eq(bankAccount.isActive, parsed.isActive));
      }
      if (parsed.isPrimary !== undefined) {
        conditions.push(eq(bankAccount.isPrimary, parsed.isPrimary));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(bankAccount).where(whereClause);
    }),
  );
