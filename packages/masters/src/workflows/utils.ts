import type {
  masterAddress,
  masterBankAccount,
  masterContact,
  masterEntity,
  masterUnitOfMeasure,
} from "#/db-schemas";
import { masterPaymentMethod } from "#/db-schemas";
import { assertPaymentMethodTypeFields } from "#/utils/payment-method-rules";

import type { MasterEntityType, PaymentMethodDirection } from "@aspen-os/constants";
import { and, eq, inArray, ne } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export { assertPaymentMethodTypeFields };

type DrizzleDB = PostgresJsDatabase;

type PrimaryOwnedTable = typeof masterAddress | typeof masterBankAccount | typeof masterContact;

export interface UnsetPrimaryForOwnerInput {
  db: DrizzleDB;
  entityId: string;
  entityType: MasterEntityType;
  table: PrimaryOwnedTable;
}

export async function unsetPrimaryForOwner(input: UnsetPrimaryForOwnerInput): Promise<void> {
  const { db, entityId, entityType, table } = input;
  await db
    .update(table)
    .set({ isPrimary: false })
    .where(
      and(
        eq(table.entityType, entityType),
        eq(table.entityId, entityId),
        eq(table.isPrimary, true),
      ),
    );
}

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
    .set({ isPrimary: false })
    .where(
      and(
        eq(masterPaymentMethod.entityType, entityType),
        eq(masterPaymentMethod.entityId, entityId),
        eq(masterPaymentMethod.isPrimary, true),
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
