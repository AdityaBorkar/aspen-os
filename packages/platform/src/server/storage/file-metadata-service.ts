import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { fileMetadata } from "./db-schema";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export class FileMetadataService {
  constructor(private readonly db: DrizzleDB) {}

  async upsertMetadata(input: {
    bucket: string;
    contentType?: string;
    etag?: string;
    key: string;
    metadata?: Record<string, string>;
    size: number;
  }): Promise<void> {
    await this.db
      .insert(fileMetadata)
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
        target: [fileMetadata.key, fileMetadata.tenantId],
      });
  }

  async deleteMetadata(key: string): Promise<void> {
    await this.db.delete(fileMetadata).where(eq(fileMetadata.key, key));
  }

  async markArchived(key: string, archivedKey: string): Promise<void> {
    await this.db
      .update(fileMetadata)
      .set({ archived: true, archivedKey, updatedAt: new Date() })
      .where(eq(fileMetadata.key, key));
  }
}
