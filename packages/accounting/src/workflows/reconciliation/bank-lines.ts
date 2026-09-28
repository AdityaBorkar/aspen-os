import { accountingBankStatementLine } from "#/db-schemas/payment";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, optional, string } from "valibot";

const InputSchema = object({ bankAccount: optional(string()), matchStatus: optional(string()) });

export const listBankStatementLines = Workflow.name("accounting.reconciliation.bank-lines")
  .input(InputSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.bankAccount) {
        conditions.push(eq(accountingBankStatementLine.bank_account, input.bankAccount));
      }
      if (input.matchStatus) {
        if (
          input.matchStatus !== "matched" &&
          input.matchStatus !== "reconciled" &&
          input.matchStatus !== "unmatched"
        ) {
          throw new Error(`Unknown match status "${input.matchStatus}".`);
        }
        conditions.push(eq(accountingBankStatementLine.match_status, input.matchStatus));
      }
      if (conditions.length === 0) {
        return ctx.db
          .select()
          .from(accountingBankStatementLine)
          .orderBy(desc(accountingBankStatementLine.statement_date));
      }
      return ctx.db
        .select()
        .from(accountingBankStatementLine)
        .where(and(...conditions))
        .orderBy(desc(accountingBankStatementLine.statement_date));
    }),
  );
