import { workspaceView } from "#/db-schemas";

import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export async function unsetDefaultView(
  db: NodePgDatabase,
  ownerId: string,
  domain: string,
): Promise<void> {
  await db
    .update(workspaceView)
    .set({ isDefault: false })
    .where(
      and(
        eq(workspaceView.ownerId, ownerId),
        eq(workspaceView.domain, domain),
        eq(workspaceView.isDefault, true),
      ),
    );
}
