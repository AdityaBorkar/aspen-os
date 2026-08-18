import { fileMetadata } from "#/server/db/schema";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DrizzleDB = PostgresJsDatabase;

export class FileMetadataService {
  readonly #db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.#db = db;
  }

  async upsertMetadata(input: {
    bucket: string;
    contentType?: string;
    etag?: string;
    key: string;
    metadata?: Record<string, string>;
    size: number;
  }): Promise<void> {
    await this.#db
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
    await this.#db.delete(fileMetadata).where(eq(fileMetadata.key, key));
  }

  async markArchived(key: string, archivedKey: string): Promise<void> {
    await this.#db
      .update(fileMetadata)
      .set({ archived: true, archivedKey, updatedAt: new Date() })
      .where(eq(fileMetadata.key, key));
  }
}
