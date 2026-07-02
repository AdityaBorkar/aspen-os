import { getDrizzle, getPool } from "../../lib/db";
import { createS3Client, createS3Operations } from "./s3-client";
import * as schema from "./schema";
import { createFileMetadataService } from "./service";
import type { FileObject, FilesConfig, FilesModule } from "./types";

export type {
  FileObject,
  FilesConfig,
  FilesModule,
  FileUploadInput,
  ListOptions,
  SignedUrlOptions,
  StorageProvider,
} from "./types";

export function createFilesModule(config: FilesConfig): FilesModule {
  const pool = getPool(config.database);
  const db = getDrizzle(config.database, schema);
  const prefix = config.prefix ?? "";

  const s3 = createS3Client(config.provider, config.region);
  const s3Ops = createS3Operations(s3, config.bucket, fullKey);
  const metadataService = createFileMetadataService(db);

  function fullKey(key: string): string {
    return prefix ? `${prefix}/${key}` : key;
  }

  async function initialize(): Promise<void> {
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
    s3.destroy();
  }

  async function upload(
    input: import("./types").FileUploadInput,
  ): Promise<FileObject> {
    const { head } = await s3Ops.upload(input);
    await metadataService.upsertMetadata({
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
    await s3Ops.remove(key);
    await metadataService.deleteMetadata(key);
  }

  async function removeMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(remove));
  }

  async function copy(
    sourceKey: string,
    destinationKey: string,
  ): Promise<FileObject> {
    await s3Ops.copy(sourceKey, destinationKey);
    return s3Ops.getMetadata(destinationKey);
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
    const destKey = archiveKey ?? `archive/${key}`;
    const file = await copy(key, destKey);
    await remove(key);
    await metadataService.markArchived(key, destKey);
    return { ...file, key: destKey };
  }

  return {
    archive,
    copy,
    destroy,
    exists: s3Ops.exists,
    get: s3Ops.get,
    getMetadata: s3Ops.getMetadata,
    getSignedGetUrl: s3Ops.getSignedGetUrl,
    getSignedPutUrl: s3Ops.getSignedPutUrl,
    initialize,
    list: s3Ops.list,
    move,
    remove,
    removeMany,
    upload,
  };
}
