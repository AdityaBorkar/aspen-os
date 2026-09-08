import { masterFilterView } from "#/db-schemas";

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
    .update(masterFilterView)
    .set({ is_default: false })
    .where(
      and(
        eq(masterFilterView.owner_id, ownerId),
        eq(masterFilterView.domain, domain),
        projectId
          ? eq(masterFilterView.project_id, projectId)
          : isNull(masterFilterView.project_id),
        eq(masterFilterView.is_default, true),
      ),
    );
}
