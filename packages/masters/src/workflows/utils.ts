import type { masterEntity, masterUnitOfMeasure } from "#/db-schemas";
import { masterPaymentMethod } from "#/db-schemas";
import { assertPaymentMethodTypeFields } from "#/utils/payment-method-rules";

import type { MasterEntityType, PaymentMethodDirection } from "@aspen-os/constants";
import { and, eq, inArray, ne } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export { assertPaymentMethodTypeFields };

type DrizzleDB = PostgresJsDatabase;

const OVERLAPPING_DIRECTIONS = {
  both: ["both", "inbound", "outbound"],
  inbound: ["both", "inbound"],
  outbound: ["both", "outbound"],
} as const satisfies Record<PaymentMethodDirection, readonly PaymentMethodDirection[]>;

export interface UnsetPrimaryPaymentMethodsInput {
  db: DrizzleDB;
  direction: PaymentMethodDirection;
  entityId: string;
  entityType: MasterEntityType;
}

export async function unsetPrimaryPaymentMethods(
  input: UnsetPrimaryPaymentMethodsInput,
): Promise<void> {
  const { db, direction, entityId, entityType } = input;

  await db
    .update(masterPaymentMethod)
    .set({ is_primary: false })
    .where(
      and(
        eq(masterPaymentMethod.entity_type, entityType),
        eq(masterPaymentMethod.entity_id, entityId),
        eq(masterPaymentMethod.is_primary, true),
        inArray(masterPaymentMethod.direction, [...OVERLAPPING_DIRECTIONS[direction]]),
      ),
    );
}

type CodedTable = typeof masterEntity | typeof masterUnitOfMeasure;

export interface AssertCodeUniqueInput {
  code: string;
  db: DrizzleDB;
  excludeId?: string;
  label: string;
  table: CodedTable;
}

export async function assertCodeUnique(input: AssertCodeUniqueInput): Promise<void> {
  const { code, db, excludeId, label, table } = input;
  const [existing] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.code, code), excludeId ? ne(table.id, excludeId) : undefined))
    .limit(1);

  if (existing) {
    throw new Error(`${label} with code "${code}" already exists.`);
  }
}
