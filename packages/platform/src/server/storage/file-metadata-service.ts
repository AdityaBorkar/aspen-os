import { fileMetadata } from "#/server/db/schema";
import { context } from "#/server/utils";

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DrizzleDB = PostgresJsDatabase;

export interface FileMetadataRow {
  archived: boolean | null;
  archivedKey: string | null;
  bucket: string;
  contentType: string | null;
  etag: string | null;
  key: string;
  metadata: unknown;
  size: number;
  tenantId: string;
}

function resolveTenantId(override?: string): string {
  return override ?? context.getStore()?.tenantId ?? "default";
}

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
    tenantId?: string;
  }): Promise<void> {
    const tenantId = resolveTenantId(input.tenantId);
    await this.#db
      .insert(fileMetadata)
      .values({
        bucket: input.bucket,
        content_type: input.contentType ?? null,
        etag: input.etag ?? null,
        key: input.key,
        metadata: input.metadata ?? {},
        size: input.size,
        tenant_id: tenantId,
      })
      .onConflictDoUpdate({
        set: {
          content_type: input.contentType ?? null,
          etag: input.etag ?? null,
          metadata: input.metadata ?? {},
          size: input.size,
          updated_at: new Date(),
        },
        target: [fileMetadata.key, fileMetadata.tenant_id],
      });
  }

  async getMetadata(key: string, tenantId?: string): Promise<FileMetadataRow | null> {
    const owner = resolveTenantId(tenantId);
    const [row] = await this.#db
      .select({
        archived: fileMetadata.archived,
        archivedKey: fileMetadata.archived_key,
        bucket: fileMetadata.bucket,
        contentType: fileMetadata.content_type,
        etag: fileMetadata.etag,
        key: fileMetadata.key,
        metadata: fileMetadata.metadata,
        size: fileMetadata.size,
        tenantId: fileMetadata.tenant_id,
      })
      .from(fileMetadata)
      .where(and(eq(fileMetadata.key, key), eq(fileMetadata.tenant_id, owner)))
      .limit(1);
    return row ?? null;
  }

  async deleteMetadata(key: string, tenantId?: string): Promise<void> {
    const owner = resolveTenantId(tenantId);
    await this.#db
      .delete(fileMetadata)
      .where(and(eq(fileMetadata.key, key), eq(fileMetadata.tenant_id, owner)));
  }

  async markArchived(key: string, archivedKey: string, tenantId?: string): Promise<void> {
    const owner = resolveTenantId(tenantId);
    await this.#db
      .update(fileMetadata)
      .set({ archived: true, archived_key: archivedKey, updated_at: new Date() })
      .where(and(eq(fileMetadata.key, key), eq(fileMetadata.tenant_id, owner)));
  }
}
