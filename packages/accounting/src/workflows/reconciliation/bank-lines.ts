import { accountingBankStatementLine } from "#/db-schemas/payment";

import { Workflow } from "@aspen-os/platform/server";
import { desc } from "drizzle-orm";
import { object, optional, string } from "valibot";

const InputSchema = object({ bankAccount: optional(string()), matchStatus: optional(string()) });

export const listBankStatementLines = Workflow.name("accounting.reconciliation.bank-lines")
  .input(InputSchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(accountingBankStatementLine)
        .orderBy(desc(accountingBankStatementLine.statement_date)),
    ),
  );
