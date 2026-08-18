import { masterAddress, masterBankAccount, masterContact, masterPaymentMethod } from "#/db-schemas";

import type {
  MasterEntityType,
  PaymentMethodDirection,
  PaymentMethodType,
} from "@aspen-os/constants";
import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DrizzleDB = PostgresJsDatabase;

export async function unsetPrimaryContacts(
  db: DrizzleDB,
  entityType: MasterEntityType,
  entityId: string,
): Promise<void> {
  await db
    .update(masterContact)
    .set({ isPrimary: false })
    .where(
      and(
        eq(masterContact.entityType, entityType),
        eq(masterContact.entityId, entityId),
        eq(masterContact.isPrimary, true),
      ),
    );
}

export async function unsetPrimaryAddresses(
  db: DrizzleDB,
  entityType: MasterEntityType,
  entityId: string,
): Promise<void> {
  await db
    .update(masterAddress)
    .set({ isPrimary: false })
    .where(
      and(
        eq(masterAddress.entityType, entityType),
        eq(masterAddress.entityId, entityId),
        eq(masterAddress.isPrimary, true),
      ),
    );
}

export async function unsetPrimaryBankAccounts(
  db: DrizzleDB,
  entityType: MasterEntityType,
  entityId: string,
): Promise<void> {
  await db
    .update(masterBankAccount)
    .set({ isPrimary: false })
    .where(
      and(
        eq(masterBankAccount.entityType, entityType),
        eq(masterBankAccount.entityId, entityId),
        eq(masterBankAccount.isPrimary, true),
      ),
    );
}

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
  const overlappingDirections: readonly PaymentMethodDirection[] =
    direction === "both"
      ? ["both", "inbound", "outbound"]
      : direction === "inbound"
        ? ["both", "inbound"]
        : ["both", "outbound"];

  await db
    .update(masterPaymentMethod)
    .set({ isPrimary: false })
    .where(
      and(
        eq(masterPaymentMethod.entityType, entityType),
        eq(masterPaymentMethod.entityId, entityId),
        eq(masterPaymentMethod.isPrimary, true),
        inArray(masterPaymentMethod.direction, [...overlappingDirections]),
      ),
    );
}

export interface PaymentMethodTypeFields {
  bankAccountId: string | null | undefined;
  cardBrand: string | null | undefined;
  cardExpiryMonth: number | null | undefined;
  cardExpiryYear: number | null | undefined;
  cardLast4: string | null | undefined;
  type: PaymentMethodType;
  upiId: string | null | undefined;
}

export function assertPaymentMethodTypeFields(method: PaymentMethodTypeFields): void {
  switch (method.type) {
    case "card": {
      if (
        !method.cardBrand ||
        !method.cardLast4 ||
        method.cardExpiryMonth === null ||
        method.cardExpiryMonth === undefined ||
        method.cardExpiryYear === null ||
        method.cardExpiryYear === undefined
      ) {
        throw new Error(
          "A card payment method requires cardBrand, cardLast4, cardExpiryMonth and cardExpiryYear.",
        );
      }
      return;
    }
    case "upi": {
      if (!method.upiId) {
        throw new Error("A UPI payment method requires upiId.");
      }
      return;
    }
    case "bank_account":
    case "imps":
    case "cheque": {
      if (!method.bankAccountId) {
        throw new Error(
          "A bank-backed payment method (bank_account/imps/cheque) requires bankAccountId.",
        );
      }
    }
  }
}
