import { dmsFileView } from "#/db-schemas";

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function unsetDefaultFileView(db: PostgresJsDatabase, ownerId: string): Promise<void> {
  await db
    .update(dmsFileView)
    .set({ isDefault: false })
    .where(and(eq(dmsFileView.ownerId, ownerId), eq(dmsFileView.isDefault, true)));
}
