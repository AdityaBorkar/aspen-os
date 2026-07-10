import type { DatabaseUnit } from "../db";
import { FileMetadataService } from "./file-metadata-service";
import { S3Adapter } from "./s3-adapter";
import type {
  FileObject,
  FileUploadInput,
  ListOptions,
  SignedUrlOptions,
  StorageConfig,
} from "./types";

export type { StorageConfig };

export class StorageUnit {
  readonly $name = "storage";

  private readonly config: StorageConfig;
  private readonly ops: S3Adapter;
  private readonly metadata: FileMetadataService;

  constructor(config: StorageConfig, { db }: { db: DatabaseUnit }) {
    this.config = config;
    this.metadata = new FileMetadataService(db.db);
    this.ops = new S3Adapter({
      ...config,
      getKey: (key) => (config.prefix ? `${config.prefix ?? ""}/${key}` : key),
    });
  }

  async $prepare(): Promise<void> {
    return;
  }

  async $destroy(): Promise<void> {
    // Cleanup if needed
  }

  // -------------------------------------------------

  async archive(key: string, archiveKey?: string): Promise<FileObject> {
    const destKey = archiveKey ?? `archive/${key}`;
    const file = await this.copy(key, destKey);
    await this.remove(key);
    await this.metadata.markArchived(key, destKey);
    return { ...file, key: destKey };
  }

  async copy(sourceKey: string, destinationKey: string): Promise<FileObject> {
    await this.ops.copy(sourceKey, destinationKey);
    return this.ops.getMetadata(destinationKey);
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

  async getSignedGetUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    return this.ops.getSignedGetUrl(key, options);
  }

  async getSignedPutUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    return this.ops.getSignedPutUrl(key, options);
  }

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
