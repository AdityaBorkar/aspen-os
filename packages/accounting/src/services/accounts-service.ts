import { accountingAccount } from "#/db-schemas/chart";
import type { AccountType } from "#/utils/constants";
import type { Db } from "#/workflows/db";

import { and, eq } from "drizzle-orm";

export interface ResolveControlAccountInput {
  accountType: AccountType;
  db: Db;
  label: string;
}

export async function resolveControlAccount(input: ResolveControlAccountInput): Promise<string> {
  const { accountType, db, label } = input;
  const [row] = await db
    .select({ id: accountingAccount.id })
    .from(accountingAccount)
    .where(
      and(
        eq(accountingAccount.account_type, accountType),
        eq(accountingAccount.is_group, false),
        eq(accountingAccount.is_disabled, false),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error(`No active ${label} control account found. Create one first.`);
  }
  return row.id;
}

export async function resolveReceivableAccount(db: Db): Promise<string> {
  return resolveControlAccount({ accountType: "receivable", db, label: "receivable" });
}

export async function resolvePayableAccount(db: Db): Promise<string> {
  return resolveControlAccount({ accountType: "payable", db, label: "payable" });
}

export async function resolveIncomeAccount(db: Db): Promise<string> {
  return resolveControlAccount({ accountType: "income", db, label: "income" });
}

export async function resolveExpenseAccount(db: Db): Promise<string> {
  return resolveControlAccount({ accountType: "expense", db, label: "expense" });
}
