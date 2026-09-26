import type { DatabaseUnit } from "#/server/db";
import { context } from "#/server/utils";

import { parse } from "valibot";

import { FileMetadataService } from "./file-metadata-service";
import { S3Adapter } from "./s3-adapter";
import { StorageConfigSchema } from "./types";
import type {
  FileObject,
  FileUploadInput,
  ListOptions,
  SignedPutUrlOptions,
  SignedUrlOptions,
  StorageConfig,
} from "./types";

/**
 * S3-compatible object storage with Postgres metadata tracking.
 *
 * Key contract: every public method takes and returns **logical keys**
 * (caller-owned paths such as `documents/report.pdf`; never the config
 * prefix or tenant). The unit maps them to physical S3 keys of the form
 * `<prefix>/<tenantId>/<logical>` and `file_metadata.key` stores the
 * logical key. Callers must never embed the tenant or prefix themselves.
 */
export class StorageUnit {
  readonly $name = "storage";

  private readonly config: StorageConfig;
  private readonly ops: S3Adapter;
  private readonly metadata: FileMetadataService;

  constructor(config: StorageConfig, { db }: { db: DatabaseUnit<any> }) {
    this.config = parse(StorageConfigSchema, config);
    this.metadata = new FileMetadataService(db.db);
    const getKey = (key: string): string => {
      const tenantId = context.getStore()?.tenantId ?? "default";
      const prefix = this.config.prefix ? `${this.config.prefix}/` : "";
      return `${prefix}${tenantId}/${key}`;
    };
    this.ops = new S3Adapter({
      ...this.config,
      getKey,
      getKeyPrefix: () => getKey(""),
    });
  }

  async $cleanup(): Promise<void> {}

  async archive(key: string, archiveKey?: string): Promise<FileObject> {
    const destKey = archiveKey ?? `archive/${key}`;
    await this.ops.copy(key, destKey);
    const file = await this.ops.getMetadata(destKey);
    await this.syncDestMetadata(destKey, file);
    await this.metadata.markArchived(key, destKey);
    await this.ops.remove(key);
    return file;
  }

  async copy(sourceKey: string, destinationKey: string): Promise<FileObject> {
    await this.ops.copy(sourceKey, destinationKey);
    const file = await this.ops.getMetadata(destinationKey);
    await this.syncDestMetadata(destinationKey, file);
    return file;
  }

  async exists(key: string): Promise<boolean> {
    return this.ops.exists(key);
  }

  async get(key: string): Promise<Buffer> {
    return this.ops.get(key);
  }

  async getMetadata(key: string): Promise<FileObject> {
    return this.ops.getMetadata(key);
  }

  async getMetadataRow(key: string) {
    return this.metadata.getMetadata(key);
  }

  async getSignedGetUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    return this.ops.getSignedGetUrl(key, options);
  }

  async getSignedPutUrl(key: string, options?: SignedPutUrlOptions): Promise<string> {
    return this.ops.getSignedPutUrl(key, options);
  }

  /** Lists logical keys under a logical prefix; bare `list()` scopes to the caller tenant. */

  async list(
    prefix?: string,
    options?: ListOptions,
  ): Promise<{ files: FileObject[]; nextContinuationToken?: string }> {
    return this.ops.list(prefix, options);
  }

  async move(sourceKey: string, destinationKey: string): Promise<FileObject> {
    const file = await this.copy(sourceKey, destinationKey);
    await this.remove(sourceKey);
    return file;
  }

  async remove(key: string): Promise<void> {
    await this.ops.remove(key);
    await this.metadata.deleteMetadata(key);
  }

  private async syncDestMetadata(key: string, file: FileObject): Promise<void> {
    await this.metadata.upsertMetadata({
      bucket: this.config.bucket,
      contentType: file.contentType,
      etag: file.etag,
      key,
      metadata: file.metadata,
      size: file.size,
    });
  }

  async upload(input: FileUploadInput): Promise<FileObject> {
    const { head } = await this.ops.upload(input);
    await this.metadata.upsertMetadata({
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
}
