import { workspaceView } from "#/db-schemas";

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function unsetDefaultView(
  db: PostgresJsDatabase,
  ownerId: string,
  domain: string,
): Promise<void> {
  await db
    .update(workspaceView)
    .set({ is_default: false })
    .where(
      and(
        eq(workspaceView.owner_id, ownerId),
        eq(workspaceView.domain, domain),
        eq(workspaceView.is_default, true),
      ),
    );
}
