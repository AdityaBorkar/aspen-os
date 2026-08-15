import { masterAddress, masterBankAccount, masterContact } from "#/db-schemas";

import type { MasterEntityType } from "@aspen-os/constants";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type DrizzleDB = NodePgDatabase;

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
