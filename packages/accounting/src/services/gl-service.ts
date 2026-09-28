import { accountingGlEntry } from "#/db-schemas/chart";
import { assertBalanced, parseMoney, roundMoney, toMoney } from "#/utils/money";
import { normalizePartyType } from "#/utils/party";
import type { Db } from "#/workflows/db";

import { eq } from "drizzle-orm";

export interface GlRowInput {
  accountId: string;
  credit?: number;
  debit?: number;
  partyId?: string | null;
  partyType?: string | null;
}

export interface PostGlInput {
  db: Db;
  fiscalYear: string;
  postingDate: string;
  rows: GlRowInput[];
  voucherId: string;
  voucherType: string;
}

export async function postGlEntries(input: PostGlInput): Promise<void> {
  const { db, fiscalYear, postingDate, rows, voucherId, voucherType } = input;
  let totalDebit = 0;
  let totalCredit = 0;
  for (const row of rows) {
    totalDebit = roundMoney(totalDebit + (row.debit ?? 0));
    totalCredit = roundMoney(totalCredit + (row.credit ?? 0));
  }
  assertBalanced(totalDebit, totalCredit);
  if (rows.length === 0) {
    throw new Error("GL posting requires at least one row.");
  }
  await db.insert(accountingGlEntry).values(
    rows.map((row) => ({
      account_id: row.accountId,
      credit: toMoney(roundMoney(row.credit ?? 0)),
      debit: toMoney(roundMoney(row.debit ?? 0)),
      fiscal_year: fiscalYear,
      party_id: row.partyId ?? null,
      party_type: normalizePartyType(row.partyType),
      posting_date: postingDate,
      voucher_id: voucherId,
      voucher_type: voucherType,
    })),
  );
}

export interface ReverseGlInput {
  db: Db;
  fiscalYear: string;
  postingDate: string;
  voucherId: string;
  voucherType: string;
}

export async function reverseGlEntries(input: ReverseGlInput): Promise<void> {
  const { db, fiscalYear, postingDate, voucherId, voucherType } = input;
  const existing = await db
    .select()
    .from(accountingGlEntry)
    .where(eq(accountingGlEntry.voucher_id, voucherId));
  const scoped = existing.filter((row) => row.voucher_type === voucherType);
  if (scoped.length === 0) {
    return;
  }
  await db.insert(accountingGlEntry).values(
    scoped.map((row) => ({
      account_id: row.account_id,
      credit: row.debit,
      debit: row.credit,
      fiscal_year: fiscalYear,
      party_id: row.party_id,
      party_type: row.party_type,
      posting_date: postingDate,
      voucher_id: voucherId,
      voucher_type: voucherType,
    })),
  );
}

export async function sumGlForVoucher(input: {
  db: Db;
  voucherId: string;
}): Promise<{ credit: number; debit: number }> {
  const { db, voucherId } = input;
  const rows = await db
    .select({ credit: accountingGlEntry.credit, debit: accountingGlEntry.debit })
    .from(accountingGlEntry)
    .where(eq(accountingGlEntry.voucher_id, voucherId));
  let debit = 0;
  let credit = 0;
  for (const row of rows) {
    debit = roundMoney(debit + parseMoney(row.debit));
    credit = roundMoney(credit + parseMoney(row.credit));
  }
  return { credit, debit };
}
