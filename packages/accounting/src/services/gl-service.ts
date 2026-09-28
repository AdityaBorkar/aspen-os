import { accountingGlEntry } from "#/db-schemas/chart";
import { assertBalanced, parseMoney, roundMoney, toMoney } from "#/utils/money";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type Db = PostgresJsDatabase;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

export interface GlRowInput {
  accountId: string;
  credit?: number;
  debit?: number;
  partyId?: string | null;
  partyType?: string | null;
}

export interface PostGlInput {
  db: DbOrTx;
  fiscalYear: string;
  postingDate: string;
  rows: GlRowInput[];
  voucherId: string;
  voucherType: string;
}

function toGlPartyType(value: string | null | undefined): "customer" | "vendor" | null {
  if (value === "customer") {
    return "customer";
  }
  if (value === "vendor") {
    return "vendor";
  }
  return null;
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
  // SAFETY: DbOrTx covers both the request db and the transaction handle, which share the same insert surface.
  const handle = db as Db;
  await handle.insert(accountingGlEntry).values(
    rows.map((row) => ({
      account_id: row.accountId,
      credit: toMoney(roundMoney(row.credit ?? 0)),
      debit: toMoney(roundMoney(row.debit ?? 0)),
      fiscal_year: fiscalYear,
      party_id: row.partyId ?? null,
      party_type: toGlPartyType(row.partyType),
      posting_date: postingDate,
      voucher_id: voucherId,
      voucher_type: voucherType,
    })),
  );
}

export interface ReverseGlInput {
  db: DbOrTx;
  fiscalYear: string;
  postingDate: string;
  voucherId: string;
  voucherType: string;
}

export async function reverseGlEntries(input: ReverseGlInput): Promise<void> {
  const { db, fiscalYear, postingDate, voucherId, voucherType } = input;
  // SAFETY: DbOrTx covers both the request db and the transaction handle, which share the same select/insert surface.
  const handle = db as Db;
  const existing = await handle
    .select()
    .from(accountingGlEntry)
    .where(eq(accountingGlEntry.voucher_id, voucherId));
  const scoped = existing.filter((row) => row.voucher_type === voucherType);
  if (scoped.length === 0) {
    return;
  }
  await handle.insert(accountingGlEntry).values(
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
  db: DbOrTx;
  voucherId: string;
}): Promise<{ credit: number; debit: number }> {
  const { db, voucherId } = input;
  // SAFETY: DbOrTx covers both the request db and the transaction handle, which share the same select surface.
  const handle = db as Db;
  const rows = await handle
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
