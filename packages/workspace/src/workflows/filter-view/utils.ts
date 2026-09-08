import { workspaceFilterView } from "#/db-schemas";

import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface UnsetDefaultFilterViewInput {
  db: PostgresJsDatabase;
  domain: string;
  ownerId: string;
  projectId: string | null;
}

export async function unsetDefaultFilterView(input: UnsetDefaultFilterViewInput): Promise<void> {
  const { db, domain, ownerId, projectId } = input;
  await db
    .update(workspaceFilterView)
    .set({ is_default: false })
    .where(
      and(
        eq(workspaceFilterView.owner_id, ownerId),
        eq(workspaceFilterView.domain, domain),
        projectId
          ? eq(workspaceFilterView.project_id, projectId)
          : isNull(workspaceFilterView.project_id),
        eq(workspaceFilterView.is_default, true),
      ),
    );
}
