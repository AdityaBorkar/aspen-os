import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as s from "./schema";
import type { FileObject, FileUploadInput } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export function createFileMetadataService(db: DrizzleDB) {
	async function upsertMetadata(input: {
		key: string;
		bucket: string;
		size: number;
		contentType?: string;
		etag?: string;
		metadata?: Record<string, string>;
	}): Promise<void> {
		await db
			.insert(s.fileMetadata)
			.values({
				key: input.key,
				bucket: input.bucket,
				size: input.size,
				contentType: input.contentType ?? null,
				etag: input.etag ?? null,
				metadata: input.metadata ?? {},
			})
			.onConflictDoUpdate({
				target: s.fileMetadata.key,
				set: {
					size: input.size,
					contentType: input.contentType ?? null,
					etag: input.etag ?? null,
					metadata: input.metadata ?? {},
					updatedAt: new Date(),
				},
			});
	}

	async function deleteMetadata(key: string): Promise<void> {
		await db.delete(s.fileMetadata).where(eq(s.fileMetadata.key, key));
	}

	async function markArchived(key: string, archivedKey: string): Promise<void> {
		await db
			.update(s.fileMetadata)
			.set({ archived: true, archivedKey, updatedAt: new Date() })
			.where(eq(s.fileMetadata.key, key));
	}

	return { upsertMetadata, deleteMetadata, markArchived };
}
