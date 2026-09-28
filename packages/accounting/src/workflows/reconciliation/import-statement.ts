import { accountingBankStatementLine } from "#/db-schemas/payment";
import { ImportBankStatementSchema } from "#/schemas/payment";
import { toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: ImportBankStatementSchema });

export const importBankStatement = Workflow.name("accounting.reconciliation.import-statement")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ImportBankStatementSchema, input);

    const rows = await ctx.db
      .insert(accountingBankStatementLine)
      .values(
        parsed.lines.map((line) => ({
          amount: toMoney(line.amount),
          bank_account: line.bankAccount,
          description: line.description ?? null,
          match_status: "unmatched" as const,
          matched_payment_id: null,
          reference_no: line.referenceNo ?? null,
          statement_date: line.statementDate,
        })),
      )
      .returning();

    return rows;
  });
