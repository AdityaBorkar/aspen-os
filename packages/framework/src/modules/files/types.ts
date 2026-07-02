import type { DatabaseConfig } from "../../lib/types";

export interface FilesConfig {
	database: DatabaseConfig;
	provider: StorageProvider;
	bucket: string;
	region?: string;
	prefix?: string;
}

export interface StorageProvider {
	type: "s3";
	endpoint: string;
	accessKeyId: string;
	secretAccessKey: string;
	region?: string;
	forcePathStyle?: boolean;
}

export interface FileUploadInput {
	key: string;
	body: Buffer | ReadableStream | string;
	contentType?: string;
	metadata?: Record<string, string>;
	cacheControl?: string;
}

export interface FileObject {
	key: string;
	size: number;
	lastModified: Date;
	etag: string;
	contentType?: string;
	metadata?: Record<string, string>;
}

export interface SignedUrlOptions {
	expiresIn?: number;
	responseContentType?: string;
	responseContentDisposition?: string;
}

export interface ListOptions {
	maxKeys?: number;
	continuationToken?: string;
}

export interface FilesModule {
	initialize(): Promise<void>;
	destroy(): Promise<void>;

	upload(input: FileUploadInput): Promise<FileObject>;
	get(key: string): Promise<Buffer>;
	getSignedGetUrl(key: string, options?: SignedUrlOptions): Promise<string>;
	getSignedPutUrl(key: string, options?: SignedUrlOptions): Promise<string>;
	remove(key: string): Promise<void>;
	removeMany(keys: string[]): Promise<void>;
	list(
		prefix?: string,
		options?: ListOptions,
	): Promise<{ files: FileObject[]; nextContinuationToken?: string }>;
	exists(key: string): Promise<boolean>;
	copy(sourceKey: string, destinationKey: string): Promise<FileObject>;
	move(sourceKey: string, destinationKey: string): Promise<FileObject>;
	getMetadata(key: string): Promise<FileObject>;
	archive(key: string, archiveKey?: string): Promise<FileObject>;
}
