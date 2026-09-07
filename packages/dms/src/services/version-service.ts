import { dmsFile, dmsFileVersion } from "#/db-schemas";
import { getDmsConfig } from "#/runtime";
import { pruneVersions } from "#/services/purge-service";
import {
  computeStorageKey,
  copy as copyStorage,
  upload as uploadStorage,
} from "#/services/storage-bridge";
import type { DmsFile, DmsFileVersion } from "#/types";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DB = PostgresJsDatabase;

export interface AppendVersionInput {
  actorId: string;
  body: Buffer | ReadableStream | string;
  contentType?: string;
  name?: string;
  storageKey?: string;
  uploadedBy?: string;
}

/**
 * Persists the pre-mutation file row as a history entry. Snapshots always
 * record `isCurrent: false` — history rows are never current.
 */
export async function snapshotVersion(
  db: DB,
  file: DmsFile,
  actorId: string = file.uploadedBy,
): Promise<void> {
  await db.insert(dmsFileVersion).values({
    compression: file.compression,
    contentType: file.contentType,
    etag: file.etag,
    fileId: file.id,
    isCurrent: false,
    name: file.name,
    size: file.size,
    storageKey: file.storageKey,
    uploadedBy: actorId,
    version: file.version,
  });
}

export interface AppendVersionResult {
  newVersion: number;
  storageKey: string;
  updated: DmsFile;
}

/**
 * Full new-content flow: snapshot old state, upload bytes under a computed
 * key, update the file row, then prune old versions.
 */
export async function appendVersion(
  db: DB,
  file: DmsFile,
  input: AppendVersionInput,
): Promise<AppendVersionResult> {
  const newVersion = file.version + 1;
  const name = input.name ?? file.name;
  const contentType = input.contentType ?? file.contentType;
  const storageKey =
    input.storageKey ??
    computeStorageKey({
      fileId: file.id,
      name,
      version: newVersion,
    });

  const fileObject = await uploadStorage({
    body: input.body,
    contentType,
    key: storageKey,
  });

  await snapshotVersion(db, file, input.actorId);

  const [updated] = await db
    .update(dmsFile)
    .set({
      contentType,
      etag: fileObject.etag ?? null,
      name,
      size: fileObject.size,
      storageKey,
      updatedAt: new Date(),
      uploadedBy: input.uploadedBy ?? file.uploadedBy,
      version: newVersion,
    })
    .where(eq(dmsFile.id, file.id))
    .returning();

  if (!updated) {
    throw new Error(`File "${file.id}" not found.`);
  }

  await pruneVersions(db, file.id, getDmsConfig().maxVersions);
  return { newVersion, storageKey, updated };
}

export type RevertVersionResult = AppendVersionResult;

/**
 * Revert flow: snapshot the OLD (pre-revert) file state, server-side copy
 * the target version's bytes to a new key, point the file row at the copied
 * bytes, then prune. The new history row is implied by the snapshot; the
 * reverted content becomes current via the file row itself.
 */
export async function revertVersion(
  db: DB,
  file: DmsFile,
  input: { actorId: string; target: DmsFileVersion },
): Promise<RevertVersionResult> {
  const { actorId, target } = input;
  const newVersionNumber = file.version + 1;
  const storageKey = computeStorageKey({
    fileId: file.id,
    name: target.name ?? file.name,
    version: newVersionNumber,
  });

  const copied = await copyStorage({
    destKey: storageKey,
    sourceKey: target.storageKey,
  });

  await snapshotVersion(db, file, actorId);

  const [updated] = await db
    .update(dmsFile)
    .set({
      contentType: target.contentType,
      etag: copied.etag ?? target.etag ?? null,
      name: target.name ?? file.name,
      size: copied.size ?? target.size,
      storageKey,
      updatedAt: new Date(),
      uploadedBy: actorId,
      version: newVersionNumber,
    })
    .where(eq(dmsFile.id, file.id))
    .returning();

  if (!updated) {
    throw new Error(`File "${file.id}" not found.`);
  }

  await pruneVersions(db, file.id, getDmsConfig().maxVersions);
  return { newVersion: newVersionNumber, storageKey, updated };
}
