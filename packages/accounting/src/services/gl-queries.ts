import { accountingAccount, accountingGlEntry } from "#/db-schemas/chart";
import { GL_TOLERANCE } from "#/utils/money";
import type { Db } from "#/workflows/db";

import { and, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export interface GlStatementFilters {
  accountId?: string | null;
  fiscalYear?: string | null;
  fromDate?: string | null;
  partyId?: string | null;
  toDate?: string | null;
}

export function buildGlConditions(input: GlStatementFilters): SQL[] {
  const conditions: SQL[] = [];
  if (input.fiscalYear) {
    conditions.push(eq(accountingGlEntry.fiscal_year, input.fiscalYear));
  }
  if (input.fromDate) {
    conditions.push(gte(accountingGlEntry.posting_date, input.fromDate));
  }
  if (input.toDate) {
    conditions.push(lte(accountingGlEntry.posting_date, input.toDate));
  }
  if (input.accountId) {
    conditions.push(eq(accountingGlEntry.account_id, input.accountId));
  }
  if (input.partyId) {
    conditions.push(eq(accountingGlEntry.party_id, input.partyId));
  }
  return conditions;
}

export async function fetchGlEntries(
  db: Db,
  input: GlStatementFilters,
): Promise<(typeof accountingGlEntry.$inferSelect)[]> {
  const conditions = buildGlConditions(input);
  if (conditions.length === 0) {
    return db.select().from(accountingGlEntry);
  }
  return db
    .select()
    .from(accountingGlEntry)
    .where(and(...conditions));
}

export async function fetchAccountRootTypes(db: Db): Promise<Map<string, string>> {
  const accounts = await db.select().from(accountingAccount);
  return new Map(accounts.map((account) => [account.id, account.root_type]));
}

export function isBalanceSheetBalanced(
  assets: number,
  liabilities: number,
  equity: number,
): boolean {
  return Math.abs(assets - (liabilities + equity)) < GL_TOLERANCE * 2;
}
