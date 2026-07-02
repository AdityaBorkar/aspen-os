import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as s from "./schema";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export function createFileMetadataService(db: DrizzleDB) {
  async function upsertMetadata(input: {
    key: string;
    bucket: string;
    size: number;
    contentType?: string;
    etag?: string;
    metadata?: Record<string, string>;
  }): Promise<void> {
    await db
      .insert(s.fileMetadata)
      .values({
        bucket: input.bucket,
        contentType: input.contentType ?? null,
        etag: input.etag ?? null,
        key: input.key,
        metadata: input.metadata ?? {},
        size: input.size,
      })
      .onConflictDoUpdate({
        set: {
          contentType: input.contentType ?? null,
          etag: input.etag ?? null,
          metadata: input.metadata ?? {},
          size: input.size,
          updatedAt: new Date(),
        },
        target: s.fileMetadata.key,
      });
  }

  async function deleteMetadata(key: string): Promise<void> {
    await db.delete(s.fileMetadata).where(eq(s.fileMetadata.key, key));
  }

  async function markArchived(key: string, archivedKey: string): Promise<void> {
    await db
      .update(s.fileMetadata)
      .set({ archived: true, archivedKey, updatedAt: new Date() })
      .where(eq(s.fileMetadata.key, key));
  }

  return { deleteMetadata, markArchived, upsertMetadata };
}
