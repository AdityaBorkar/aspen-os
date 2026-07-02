import { createDrizzle } from "../db";
import type { Unit, UnitDeps } from "../types";
import { createS3Client, createS3Operations } from "./s3-client";
import * as schema from "./schema";
import { createFileMetadataService } from "./service";
import type {
  FileObject,
  FileUploadInput,
  StorageConfig,
  StorageUnit,
} from "./types";

export type {
  FileObject,
  FileUploadInput,
  ListOptions,
  SignedUrlOptions,
  StorageConfig,
  StorageProvider,
  StorageUnit,
} from "./types";

export function createStorageUnit(config: StorageConfig): StorageUnit & Unit {
  const prefix = config.prefix ?? "";
  let pool: import("pg").Pool | null = null;
  let db: ReturnType<typeof createDrizzle> | null = null;
  let s3Ops: ReturnType<typeof createS3Operations> | null = null;
  let metadataService: ReturnType<typeof createFileMetadataService> | null =
    null;

  function fullKey(key: string): string {
    return prefix ? `${prefix}/${key}` : key;
  }

  async function initialize(deps: UnitDeps): Promise<void> {
    pool = deps.pool;
    db = createDrizzle(deps.pool, schema);
    const s3 = createS3Client(config.provider, config.region);
    s3Ops = createS3Operations(s3, config.bucket, fullKey);
    metadataService = createFileMetadataService(db);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        key TEXT UNIQUE NOT NULL,
        bucket TEXT NOT NULL,
        size BIGINT NOT NULL DEFAULT 0,
        content_type TEXT,
        etag TEXT,
        metadata JSONB DEFAULT '{}',
        archived BOOLEAN DEFAULT FALSE,
        archived_key TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_file_metadata_key ON file_metadata(key);
      CREATE INDEX IF NOT EXISTS idx_file_metadata_archived ON file_metadata(archived);
    `);
  }

  async function destroy(): Promise<void> {
    s3Ops = null;
    metadataService = null;
    db = null;
    pool = null;
  }

  async function healthCheck(): Promise<boolean> {
    return s3Ops !== null;
  }

  function requireOps() {
    if (!s3Ops || !metadataService)
      throw new Error("Storage unit not initialized");
    return { metadata: metadataService, ops: s3Ops };
  }

  async function upload(input: FileUploadInput): Promise<FileObject> {
    const { metadata, ops } = requireOps();
    const { head } = await ops.upload(input);
    await metadata.upsertMetadata({
      bucket: config.bucket,
      contentType: input.contentType,
      etag: head.etag,
      key: input.key,
      metadata: input.metadata,
      size: head.contentLength,
    });

    return {
      contentType: input.contentType,
      etag: head.etag,
      key: input.key,
      lastModified: head.lastModified,
      metadata: input.metadata,
      size: head.contentLength,
    };
  }

  async function remove(key: string): Promise<void> {
    const { metadata, ops } = requireOps();
    await ops.remove(key);
    await metadata.deleteMetadata(key);
  }

  async function removeMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(remove));
  }

  async function copy(
    sourceKey: string,
    destinationKey: string,
  ): Promise<FileObject> {
    const { ops } = requireOps();
    await ops.copy(sourceKey, destinationKey);
    return ops.getMetadata(destinationKey);
  }

  async function move(
    sourceKey: string,
    destinationKey: string,
  ): Promise<FileObject> {
    const file = await copy(sourceKey, destinationKey);
    await remove(sourceKey);
    return file;
  }

  async function archive(
    key: string,
    archiveKey?: string,
  ): Promise<FileObject> {
    const { metadata } = requireOps();
    const destKey = archiveKey ?? `archive/${key}`;
    const file = await copy(key, destKey);
    await remove(key);
    await metadata.markArchived(key, destKey);
    return { ...file, key: destKey };
  }

  return {
    archive,
    copy,
    destroy,
    exists: (key) => requireOps().ops.exists(key),
    get: (key) => requireOps().ops.get(key),
    getMetadata: (key) => requireOps().ops.getMetadata(key),
    getSignedGetUrl: (key, options) =>
      requireOps().ops.getSignedGetUrl(key, options),
    getSignedPutUrl: (key, options) =>
      requireOps().ops.getSignedPutUrl(key, options),
    healthCheck,
    initialize,
    list: (prefix, options) => requireOps().ops.list(prefix, options),
    move,
    name: "storage",
    remove,
    removeMany,
    upload,
  };
}
