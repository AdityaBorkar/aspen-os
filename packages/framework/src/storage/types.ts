import type { DatabaseConfig, UnitDeps } from "../types";

export interface StorageConfig {
  bucket: string;
  database: DatabaseConfig;
  prefix?: string;
  provider: StorageProvider;
  region?: string;
}

export interface StorageProvider {
  accessKeyId: string;
  endpoint: string;
  forcePathStyle?: boolean;
  region?: string;
  secretAccessKey: string;
  type: "s3";
}

export interface FileUploadInput {
  body: Buffer | ReadableStream | string;
  cacheControl?: string;
  contentType?: string;
  key: string;
  metadata?: Record<string, string>;
}

export interface FileObject {
  contentType?: string;
  etag: string;
  key: string;
  lastModified: Date;
  metadata?: Record<string, string>;
  size: number;
}

export interface SignedUrlOptions {
  expiresIn?: number;
  responseContentDisposition?: string;
  responseContentType?: string;
}

export interface ListOptions {
  continuationToken?: string;
  maxKeys?: number;
}

export interface StorageUnit {
  archive(key: string, archiveKey?: string): Promise<FileObject>;
  copy(sourceKey: string, destinationKey: string): Promise<FileObject>;
  destroy(): Promise<void>;
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<Buffer>;
  getMetadata(key: string): Promise<FileObject>;
  getSignedGetUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  getSignedPutUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  initialize(deps: UnitDeps): Promise<void>;
  list(
    prefix?: string,
    options?: ListOptions,
  ): Promise<{ files: FileObject[]; nextContinuationToken?: string }>;
  move(sourceKey: string, destinationKey: string): Promise<FileObject>;
  remove(key: string): Promise<void>;
  removeMany(keys: string[]): Promise<void>;

  upload(input: FileUploadInput): Promise<FileObject>;
}
