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
  SignedUrlOptions,
  StorageConfig,
} from "./types";

export interface S3AdapterConfig extends StorageConfig {
  bucket: string;
  getKey: (key: string) => string;
}

export class S3Adapter {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly getKey: (key: string) => string;

  constructor(config: S3AdapterConfig) {
    const { provider, bucket, getKey } = config;
    this.bucket = bucket;
    this.getKey = getKey;

    this.s3 = new S3Client({
      credentials: {
        accessKeyId: provider.accessKeyId,
        secretAccessKey: provider.secretAccessKey,
      },
      endpoint: provider.endpoint,
      forcePathStyle: provider.forcePathStyle ?? true,
      region: provider.region ?? config.region ?? "us-east-1",
    });
  }

  async upload(input: FileUploadInput): Promise<{
    head: { contentLength: number; etag: string; lastModified: Date };
  }> {
    const key = this.getKey(input.key);
    const body =
      typeof input.body === "string" ? Buffer.from(input.body) : input.body;

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

    const head = await this.s3.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );

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
    const chunks: Uint8Array[] = [];
    const stream = result.Body as ReadableStream;
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  async getSignedGetUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
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

  async getSignedPutUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      ContentType: options?.responseContentType,
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
    const listPrefix = prefix ? this.getKey(prefix) : prefix;
    const result = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        ContinuationToken: options?.continuationToken,
        MaxKeys: options?.maxKeys ?? 1000,
        Prefix: listPrefix,
      }),
    );

    const files: FileObject[] = (result.Contents ?? []).map(
      (obj: {
        Key?: string;
        Size?: number;
        LastModified?: Date;
        ETag?: string;
      }) => ({
        etag: obj.ETag ?? "",
        key: (obj.Key ?? "").replace(prefix ? `${prefix}/` : "", ""),
        lastModified: obj.LastModified ?? new Date(),
        size: obj.Size ?? 0,
      }),
    );

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
        CopySource: `${this.bucket}/${this.getKey(sourceKey)}`,
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
