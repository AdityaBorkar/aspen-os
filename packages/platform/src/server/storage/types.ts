import {
  boolean,
  literal,
  maxLength,
  minLength,
  object,
  optional,
  pipe,
  regex,
  string,
  url,
} from "valibot";

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

export const StorageProviderSchema = object({
  credentials: object({
    accessKeyId: pipe(string(), minLength(1)),
    secretAccessKey: pipe(string(), minLength(1)),
  }),
  endpoint: pipe(string(), url()),
  forcePathStyle: boolean(),
  region: pipe(string(), minLength(1)),
  type: literal("s3"),
});

export const StorageConfigSchema = object({
  bucket: pipe(
    string(),
    minLength(3),
    maxLength(63),
    regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, "Must be a valid S3 bucket name"),
  ),
  prefix: optional(
    pipe(
      string(),
      minLength(1),
      maxLength(1024),
      regex(
        /^(?!.*\.\.)(?![/])(?!.*\/$)[A-Za-z0-9._/-]+$/,
        "Must not start/end with / and must not contain ..",
      ),
    ),
  ),
  provider: StorageProviderSchema,
});

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

export interface SignedPutUrlOptions {
  cacheControl?: string;
  contentType?: string;
  expiresIn?: number;
}

export interface ListOptions {
  continuationToken?: string;
  maxKeys?: number;
}
