import { masterUomAlias, masterUnitOfMeasure, masterUomVersion } from "#/db-schemas";
import type { MasterUnitOfMeasure } from "#/db-schemas/unit-of-measure";

import { and, eq, ne, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DrizzleDB = PostgresJsDatabase;

export interface AssertUomSymbolUniqueInput {
  code?: string;
  db: DrizzleDB;
  excludeId?: string;
  name?: string;
  symbol?: string | null;
}

function ciEquals(column: AnyPgColumn, value: string) {
  return sql`lower(${column}) = lower(${value})`;
}

export async function assertUomSymbolUnique(input: AssertUomSymbolUniqueInput): Promise<void> {
  const { code, db, excludeId, name, symbol } = input;
  const scope = excludeId ? ne(masterUnitOfMeasure.id, excludeId) : undefined;

  if (code) {
    const [hit] = await db
      .select({ code: masterUnitOfMeasure.code, id: masterUnitOfMeasure.id })
      .from(masterUnitOfMeasure)
      .where(and(ciEquals(masterUnitOfMeasure.code, code), scope))
      .limit(1);
    if (hit) {
      throw new Error(
        `Unit of measure code "${code}" already exists as "${hit.code}"; rename or request a merge instead of duplicating.`,
      );
    }
  }

  if (symbol) {
    const [hit] = await db
      .select({ id: masterUnitOfMeasure.id, symbol: masterUnitOfMeasure.symbol })
      .from(masterUnitOfMeasure)
      .where(and(ciEquals(masterUnitOfMeasure.symbol, symbol), scope))
      .limit(1);
    if (hit) {
      throw new Error(
        `Unit symbol "${symbol}" is already used; symbols are unique — pick another symbol or add "${symbol}" as an alias.`,
      );
    }
    const [aliasHit] = await db
      .select({ alias: masterUomAlias.alias, uom_id: masterUomAlias.uom_id })
      .from(masterUomAlias)
      .where(sql`lower(${masterUomAlias.alias}) = lower(${symbol})`)
      .limit(1);
    if (aliasHit && aliasHit.uom_id !== excludeId) {
      throw new Error(`"${symbol}" is already an alias of another unit; pick another symbol.`);
    }
  }

  if (name) {
    const [hit] = await db
      .select({ id: masterUnitOfMeasure.id, name: masterUnitOfMeasure.name })
      .from(masterUnitOfMeasure)
      .where(and(ciEquals(masterUnitOfMeasure.name, name), scope))
      .limit(1);
    if (hit) {
      throw new Error(
        `A unit named "${hit.name}" already exists; rename or request a merge instead of duplicating.`,
      );
    }
  }
}

export interface AssignCategoryDefaultInput {
  category: MasterUnitOfMeasure["category"];
  db: DrizzleDB;
  id: string;
}

export async function assignCategoryDefault(input: AssignCategoryDefaultInput): Promise<void> {
  const { category, db, id } = input;
  await db
    .update(masterUnitOfMeasure)
    .set({ is_default: false, updated_at: new Date() })
    .where(
      and(
        eq(masterUnitOfMeasure.category, category),
        eq(masterUnitOfMeasure.is_default, true),
        ne(masterUnitOfMeasure.id, id),
      ),
    );
  await db
    .update(masterUnitOfMeasure)
    .set({ is_default: true, updated_at: new Date() })
    .where(eq(masterUnitOfMeasure.id, id));
}

export interface RecordUomVersionInput {
  conversionFactor: number | null;
  db: DrizzleDB;
  decimalPlaces: number | null;
  effectiveFrom: string;
  reason?: string | null;
  uomId: string;
}

export async function recordUomVersion(input: RecordUomVersionInput): Promise<void> {
  const { conversionFactor, db, decimalPlaces, effectiveFrom, reason, uomId } = input;
  await db
    .update(masterUomVersion)
    .set({ superseded_at: new Date() })
    .where(and(eq(masterUomVersion.uom_id, uomId), sql`${masterUomVersion.superseded_at} IS NULL`));
  await db.insert(masterUomVersion).values({
    conversion_factor: conversionFactor,
    decimal_places: decimalPlaces,
    effective_from: effectiveFrom,
    reason: reason ?? null,
    uom_id: uomId,
  });
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
