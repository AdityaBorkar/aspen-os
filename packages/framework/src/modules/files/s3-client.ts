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
	StorageProvider,
} from "./types";

export function createS3Client(
	provider: StorageProvider,
	region?: string,
): S3Client {
	return new S3Client({
		endpoint: provider.endpoint,
		region: provider.region ?? region ?? "us-east-1",
		credentials: {
			accessKeyId: provider.accessKeyId,
			secretAccessKey: provider.secretAccessKey,
		},
		forcePathStyle: provider.forcePathStyle ?? true,
	});
}

export function createS3Operations(
	s3: S3Client,
	bucket: string,
	fullKey: (key: string) => string,
) {
	async function upload(input: FileUploadInput): Promise<{
		head: { contentLength: number; etag: string; lastModified: Date };
	}> {
		const key = fullKey(input.key);
		const body =
			typeof input.body === "string" ? Buffer.from(input.body) : input.body;

		await s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: body,
				ContentType: input.contentType,
				Metadata: input.metadata,
				CacheControl: input.cacheControl,
			}),
		);

		const head = await s3.send(
			new HeadObjectCommand({ Bucket: bucket, Key: key }),
		);

		return {
			head: {
				contentLength: head.ContentLength ?? 0,
				etag: head.ETag ?? "",
				lastModified: head.LastModified ?? new Date(),
			},
		};
	}

	async function get(key: string): Promise<Buffer> {
		const result = await s3.send(
			new GetObjectCommand({ Bucket: bucket, Key: fullKey(key) }),
		);
		const chunks: Uint8Array[] = [];
		const stream = result.Body as ReadableStream;
		const reader = stream.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}
		return Buffer.concat(chunks);
	}

	async function getSignedGetUrl(
		key: string,
		options?: SignedUrlOptions,
	): Promise<string> {
		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: fullKey(key),
			ResponseContentType: options?.responseContentType,
			ResponseContentDisposition: options?.responseContentDisposition,
		});
		return getSignedUrl(s3, command, { expiresIn: options?.expiresIn ?? 3600 });
	}

	async function getSignedPutUrl(
		key: string,
		options?: SignedUrlOptions,
	): Promise<string> {
		const command = new PutObjectCommand({
			Bucket: bucket,
			Key: fullKey(key),
			ContentType: options?.responseContentType,
		});
		return getSignedUrl(s3, command, { expiresIn: options?.expiresIn ?? 3600 });
	}

	async function removeObject(key: string): Promise<void> {
		await s3.send(
			new DeleteObjectCommand({ Bucket: bucket, Key: fullKey(key) }),
		);
	}

	async function list(
		prefix?: string,
		options?: ListOptions,
	): Promise<{ files: FileObject[]; nextContinuationToken?: string }> {
		const listPrefix = prefix ? fullKey(prefix) : prefix;
		const result = await s3.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: listPrefix,
				MaxKeys: options?.maxKeys ?? 1000,
				ContinuationToken: options?.continuationToken,
			}),
		);

		const files: FileObject[] = (result.Contents ?? []).map(
			(obj: {
				Key?: string;
				Size?: number;
				LastModified?: Date;
				ETag?: string;
			}) => ({
				key: (obj.Key ?? "").replace(prefix ? `${prefix}/` : "", ""),
				size: obj.Size ?? 0,
				lastModified: obj.LastModified ?? new Date(),
				etag: obj.ETag ?? "",
			}),
		);

		return { files, nextContinuationToken: result.NextContinuationToken };
	}

	async function exists(key: string): Promise<boolean> {
		try {
			await s3.send(
				new HeadObjectCommand({ Bucket: bucket, Key: fullKey(key) }),
			);
			return true;
		} catch {
			return false;
		}
	}

	async function copy(
		sourceKey: string,
		destinationKey: string,
	): Promise<void> {
		await s3.send(
			new CopyObjectCommand({
				Bucket: bucket,
				CopySource: `${bucket}/${fullKey(sourceKey)}`,
				Key: fullKey(destinationKey),
			}),
		);
	}

	async function getMetadata(key: string): Promise<FileObject> {
		const head = await s3.send(
			new HeadObjectCommand({ Bucket: bucket, Key: fullKey(key) }),
		);
		return {
			key,
			size: head.ContentLength ?? 0,
			lastModified: head.LastModified ?? new Date(),
			etag: head.ETag ?? "",
			contentType: head.ContentType,
			metadata: head.Metadata,
		};
	}

	return {
		upload,
		get,
		getSignedGetUrl,
		getSignedPutUrl,
		remove: removeObject,
		list,
		exists,
		copy,
		getMetadata,
	};
}
