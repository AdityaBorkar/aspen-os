import { createDrizzle } from "../db";
import type { Unit, UnitDeps } from "../types";
import { createS3Client, createS3Operations } from "./s3-client";
import * as schema from "./schema";
import { createFileMetadataService } from "./service";
import type { FileObject, FileUploadInput, StorageConfig } from "./types";

export type {
  FileObject,
  FileUploadInput,
  ListOptions,
  SignedUrlOptions,
  StorageConfig,
  StorageProvider,
} from "./types";

export class StorageUnit implements Unit {
  readonly name = "storage";

  private config: StorageConfig;
  private prefix: string;
  private pool: import("pg").Pool | null = null;
  private db: ReturnType<typeof createDrizzle> | null = null;
  private s3Ops: ReturnType<typeof createS3Operations> | null = null;
  private metadataService: ReturnType<typeof createFileMetadataService> | null =
    null;

  constructor(config: StorageConfig) {
    this.config = config;
    this.prefix = config.prefix ?? "";
  }

  private fullKey(key: string): string {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  async initialize(deps: UnitDeps): Promise<void> {
    this.pool = deps.pool;
    this.db = createDrizzle(deps.pool, schema);
    const s3 = createS3Client(this.config.provider, this.config.region);
    this.s3Ops = createS3Operations(s3, this.config.bucket, (key) =>
      this.fullKey(key),
    );
    this.metadataService = createFileMetadataService(this.db);

    await this.pool.query(`
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

  async destroy(): Promise<void> {
    this.s3Ops = null;
    this.metadataService = null;
    this.db = null;
    this.pool = null;
  }

  async healthCheck(): Promise<boolean> {
    return this.s3Ops !== null;
  }

  private requireOps() {
    if (!this.s3Ops || !this.metadataService)
      throw new Error("Storage unit not initialized");
    return { metadata: this.metadataService, ops: this.s3Ops };
  }

  async upload(input: FileUploadInput): Promise<FileObject> {
    const { metadata, ops } = this.requireOps();
    const { head } = await ops.upload(input);
    await metadata.upsertMetadata({
      bucket: this.config.bucket,
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

  async remove(key: string): Promise<void> {
    const { metadata, ops } = this.requireOps();
    await ops.remove(key);
    await metadata.deleteMetadata(key);
  }

  async removeMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.remove(key)));
  }

  async copy(sourceKey: string, destinationKey: string): Promise<FileObject> {
    const { ops } = this.requireOps();
    await ops.copy(sourceKey, destinationKey);
    return ops.getMetadata(destinationKey);
  }

  async move(sourceKey: string, destinationKey: string): Promise<FileObject> {
    const file = await this.copy(sourceKey, destinationKey);
    await this.remove(sourceKey);
    return file;
  }

  async archive(key: string, archiveKey?: string): Promise<FileObject> {
    const { metadata } = this.requireOps();
    const destKey = archiveKey ?? `archive/${key}`;
    const file = await this.copy(key, destKey);
    await this.remove(key);
    await metadata.markArchived(key, destKey);
    return { ...file, key: destKey };
  }

  async exists(key: string): Promise<boolean> {
    return this.requireOps().ops.exists(key);
  }

  async get(key: string): Promise<Buffer> {
    return this.requireOps().ops.get(key);
  }

  async getMetadata(key: string): Promise<FileObject> {
    return this.requireOps().ops.getMetadata(key);
  }

  async getSignedGetUrl(
    key: string,
    options?: import("./types").SignedUrlOptions,
  ): Promise<string> {
    return this.requireOps().ops.getSignedGetUrl(key, options);
  }

  async getSignedPutUrl(
    key: string,
    options?: import("./types").SignedUrlOptions,
  ): Promise<string> {
    return this.requireOps().ops.getSignedPutUrl(key, options);
  }

  async list(
    prefix?: string,
    options?: import("./types").ListOptions,
  ): Promise<{ files: FileObject[]; nextContinuationToken?: string }> {
    return this.requireOps().ops.list(prefix, options);
  }
}
