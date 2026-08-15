import { dmsFileView } from "#/db-schemas";

import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export async function unsetDefaultFileView(db: NodePgDatabase, ownerId: string): Promise<void> {
  await db
    .update(dmsFileView)
    .set({ isDefault: false })
    .where(and(eq(dmsFileView.ownerId, ownerId), eq(dmsFileView.isDefault, true)));
}
