import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  FileObject,
  FileUploadInput,
  ListOptions,
  SignedPutUrlOptions,
  SignedUrlOptions,
  StorageConfig,
} from "./types";

export interface S3AdapterConfig extends StorageConfig {
  getKey: (key: string) => string;
  getKeyPrefix: () => string;
}

function encodeCopySource(bucket: string, physicalKey: string): string {
  return `${bucket}/${physicalKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export class S3Adapter {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly getKey: (key: string) => string;
  private readonly getKeyPrefix: () => string;

  constructor(config: S3AdapterConfig) {
    const { provider, bucket, getKey, getKeyPrefix } = config;
    this.bucket = bucket;
    this.getKey = getKey;
    this.getKeyPrefix = getKeyPrefix;
    this.s3 = new S3Client({
      credentials: provider.credentials,
      endpoint: provider.endpoint.replace(/\/+$/, ""),
      forcePathStyle: provider.forcePathStyle,
      region: provider.region,
    });
  }

  async upload(input: FileUploadInput): Promise<{
    head: { contentLength: number; etag: string; lastModified: Date };
  }> {
    const key = this.getKey(input.key);
    const body = input.body instanceof ReadableStream ? input.body : Buffer.from(input.body);

    await this.s3.send(
      new PutObjectCommand({
        Body: body,
        Bucket: this.bucket,
        CacheControl: input.cacheControl,
        ContentType: input.contentType,
        Key: key,
        Metadata: input.metadata,
      }),
    );

    const head = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));

    return {
      head: {
        contentLength: head.ContentLength ?? 0,
        etag: head.ETag ?? "",
        lastModified: head.LastModified ?? new Date(),
      },
    };
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.getKey(key) }),
    );
    const body = result.Body;
    if (!body) {
      throw new Error("Failed to read object: no response body returned");
    }
    if (body instanceof Blob) {
      return Buffer.from(await body.arrayBuffer());
    }
    if (body instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = body.getReader();
      // oxlint-disable eslint/no-await-in-loop
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(value);
      }
      // oxlint-enable eslint/no-await-in-loop
      return Buffer.concat(chunks);
    }
    // AWS SDK v3 returns a Node `Readable` outside web runtimes (and custom
    // Smithy streams in others) — consume anything async-iterable of bytes.
    if (typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === "function") {
      const chunks: Uint8Array[] = [];
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }
    throw new Error("Failed to read object: unsupported response body type");
  }

  async getSignedGetUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.getKey(key),
      ResponseContentDisposition: options?.responseContentDisposition,
      ResponseContentType: options?.responseContentType,
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: options?.expiresIn ?? 3600,
    });
  }

  async getSignedPutUrl(key: string, options?: SignedPutUrlOptions): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      CacheControl: options?.cacheControl,
      ContentType: options?.contentType,
      Key: this.getKey(key),
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: options?.expiresIn ?? 3600,
    });
  }

  async remove(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: this.getKey(key),
      }),
    );
  }

  async list(
    prefix?: string,
    options?: ListOptions,
  ): Promise<{ files: FileObject[]; nextContinuationToken?: string }> {
    const tenantPrefix = this.getKeyPrefix();
    const normalized = prefix?.replace(/\/+$/, "");
    const listPrefix = normalized ? this.getKey(normalized) : tenantPrefix;
    const result = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        ContinuationToken: options?.continuationToken,
        MaxKeys: options?.maxKeys ?? 1000,
        Prefix: listPrefix,
      }),
    );

    const files: FileObject[] = [];
    for (const obj of result.Contents ?? []) {
      const physicalKey = obj.Key ?? "";
      if (!physicalKey.startsWith(tenantPrefix)) {
        continue;
      }
      files.push({
        etag: obj.ETag ?? "",
        key: physicalKey.slice(tenantPrefix.length),
        lastModified: obj.LastModified ?? new Date(),
        size: obj.Size ?? 0,
      });
    }

    return { files, nextContinuationToken: result.NextContinuationToken };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.getKey(key),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    await this.s3.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: encodeCopySource(this.bucket, this.getKey(sourceKey)),
        Key: this.getKey(destinationKey),
      }),
    );
  }

  async getMetadata(key: string): Promise<FileObject> {
    const head = await this.s3.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: this.getKey(key),
      }),
    );
    return {
      contentType: head.ContentType,
      etag: head.ETag ?? "",
      key,
      lastModified: head.LastModified ?? new Date(),
      metadata: head.Metadata,
      size: head.ContentLength ?? 0,
    };
  }
}
