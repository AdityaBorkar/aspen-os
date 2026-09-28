import { accountingFiscalYear } from "#/db-schemas/chart";

import { and, lte, gte, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type Db = PostgresJsDatabase;

export interface FiscalYearRow {
  end_date: string;
  id: string;
  name: string;
  start_date: string;
  status: string;
}

export interface AssertPeriodOpenInput {
  db: Db;
  postingDate: string;
}

export interface FiscalYearForDateInput {
  db: Db;
  postingDate: string;
}

export async function findFiscalYearForDate(
  input: FiscalYearForDateInput,
): Promise<FiscalYearRow | null> {
  const { db, postingDate } = input;
  const [row] = await db
    .select({
      end_date: accountingFiscalYear.end_date,
      id: accountingFiscalYear.id,
      name: accountingFiscalYear.name,
      start_date: accountingFiscalYear.start_date,
      status: accountingFiscalYear.status,
    })
    .from(accountingFiscalYear)
    .where(
      and(
        lte(accountingFiscalYear.start_date, postingDate),
        gte(accountingFiscalYear.end_date, postingDate),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function assertPeriodOpen(input: AssertPeriodOpenInput): Promise<FiscalYearRow> {
  const { db, postingDate } = input;
  const year = await findFiscalYearForDate({ db, postingDate });
  if (!year) {
    throw new Error(`No fiscal year covers posting date ${postingDate}.`);
  }
  if (year.status === "closed") {
    throw new Error(`Fiscal year ${year.name} is closed; posting date ${postingDate} is blocked.`);
  }
  return year;
}

export interface AssertNoClosedYearInput {
  db: Db;
  id: string;
}

export async function fetchFiscalYearById(input: AssertNoClosedYearInput): Promise<FiscalYearRow> {
  const { db, id } = input;
  const [row] = await db
    .select({
      end_date: accountingFiscalYear.end_date,
      id: accountingFiscalYear.id,
      name: accountingFiscalYear.name,
      start_date: accountingFiscalYear.start_date,
      status: accountingFiscalYear.status,
    })
    .from(accountingFiscalYear)
    .where(eq(accountingFiscalYear.id, id))
    .limit(1);
  if (!row) {
    throw new Error(`Fiscal year "${id}" not found.`);
  }
  return row;
}
