import { workspaceDraft } from "#/db-schemas";
import type { WorkspaceDraft } from "#/db-schemas/draft";
import type { DraftStatus } from "#/utils/constants";

import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function transitionDraft(
  db: PostgresJsDatabase,
  input: {
    fromStatuses: DraftStatus[];
    id: string;
    toStatus: DraftStatus;
    values: Partial<typeof workspaceDraft.$inferInsert>;
  },
): Promise<WorkspaceDraft> {
  const { fromStatuses, id, toStatus, values } = input;
  const [updated] = await db
    .update(workspaceDraft)
    .set({ ...values, status: toStatus, updatedAt: new Date() })
    .where(and(eq(workspaceDraft.id, id), inArray(workspaceDraft.status, fromStatuses)))
    .returning();

  if (!updated) {
    throw new Error(`Draft "${id}" is not in an expected state for this transition.`);
  }
  return updated;
}
