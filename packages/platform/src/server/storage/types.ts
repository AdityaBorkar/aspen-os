export interface StorageConfig {
  bucket: string;
  prefix?: string;
  provider: StorageProvider;
}

export interface StorageProvider {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint: string;
  forcePathStyle: boolean;
  region: string;
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
