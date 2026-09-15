import { healthcarePricelist } from "#/db-schemas/billing";
import { healthcareServicePrice } from "#/db-schemas/services";

import { and, desc, eq, lte, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DrizzleDB = PostgresJsDatabase;

export const DEFAULT_PRICELIST_CODE = "DEFAULT";

export interface PublishedPricelist {
  branchId: string;
  code: string;
  id: string;
  name: string;
  taxInclusive: boolean;
}

export async function findPublishedPricelist(
  db: DrizzleDB,
  input: { branchId: string; code?: string; date?: string; payer?: string },
): Promise<PublishedPricelist | null> {
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const conditions = [
    eq(healthcarePricelist.status, "published"),
    or(eq(healthcarePricelist.branch_id, input.branchId), eq(healthcarePricelist.scope, "global")),
  ];
  if (input.code) {
    conditions.push(eq(healthcarePricelist.code, input.code));
  }
  if (input.payer) {
    conditions.push(eq(healthcarePricelist.payer, input.payer));
  }
  const [row] = await db
    .select()
    .from(healthcarePricelist)
    .where(and(...conditions))
    .orderBy(desc(healthcarePricelist.version))
    .limit(10);
  if (!row) {
    return null;
  }
  const inRange =
    (!row.effective_from || row.effective_from <= date) &&
    (!row.effective_to || row.effective_to >= date);
  if (!inRange) {
    return null;
  }
  return {
    branchId: row.branch_id,
    code: row.code,
    id: row.id,
    name: row.name,
    taxInclusive: row.tax_inclusive,
  };
}

export interface ResolvedPrice {
  amount: number;
  effectiveFrom: string;
  fallback: boolean;
  gstPct: number | null;
  pricelistCode: string;
  pricelistId: string | null;
}

export async function pickServicePrice(
  db: DrizzleDB,
  input: { branchId: string; date: string; pricelist: PublishedPricelist; serviceId: string },
): Promise<ResolvedPrice | null> {
  const [row] = await db
    .select()
    .from(healthcareServicePrice)
    .where(
      and(
        eq(healthcareServicePrice.service_id, input.serviceId),
        eq(healthcareServicePrice.branch_id, input.branchId),
        lte(healthcareServicePrice.effective_from, input.date),
        or(
          eq(healthcareServicePrice.pricelist_id, input.pricelist.id),
          eq(healthcareServicePrice.pricelist, input.pricelist.code),
        ),
      ),
    )
    .orderBy(desc(healthcareServicePrice.effective_from))
    .limit(1);
  if (!row) {
    return null;
  }
  return {
    amount: Number(row.amount),
    effectiveFrom: row.effective_from,
    fallback: false,
    gstPct: row.gst_pct === null ? null : Number(row.gst_pct),
    pricelistCode: input.pricelist.code,
    pricelistId: row.pricelist_id,
  };
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
