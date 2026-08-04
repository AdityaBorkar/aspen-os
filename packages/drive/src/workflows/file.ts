import type { PubSubUnit } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import {
  checkNameUniqueness,
  computeFilePath,
  getFolderPath,
  type PathServiceDeps,
} from "../services/path-service";
import {
  computeStorageKey,
  copy as copyStorage,
  getSignedGetUrl,
  move as moveStorage,
  remove as removeStorage,
  type StorageBridgeDeps,
  upload as uploadStorage,
} from "../services/storage-bridge";
import type {
  DownloadLinkOptions,
  MoveFileInput,
  RenameFileInput,
  UpdateFileInput,
  UploadFileInput,
} from "../types";
import {
  DownloadLinkOptionsSchema,
  MoveFileSchema,
  RenameFileSchema,
  UpdateFileSchema,
  UploadFileSchema,
} from "../types";

type DB = NodePgDatabase<Record<string, never>>;

interface FileWorkflowConfig {
  allowedContentTypes: string[];
  defaultDownloadLinkExpiry: number;
  maxDownloadLinkExpiry: number;
  maxFileSize: number;
  maxVersions: number;
}

export interface FileDeps {
  config: FileWorkflowConfig;
  db: DB;
  pathDeps: PathServiceDeps;
  pubsub: PubSubUnit;
  storageDeps: StorageBridgeDeps;
}

export async function uploadFile(
  input: UploadFileInput,
  { db, pathDeps, pubsub, storageDeps }: FileDeps,
) {
  const parsed = parse(UploadFileSchema, input);
  const folderId = parsed.folderId ?? null;

  const path = await computeFilePath({ folderId, name: parsed.name }, pathDeps);

  await checkNameUniqueness(
    { name: parsed.name, parentId: folderId },
    pathDeps,
  );

  const folderPath = folderId
    ? await getFolderPath({ folderId }, pathDeps)
    : "";

  const storageKey = computeStorageKey({ fileName: parsed.name, folderPath });

  const fileObject = await uploadStorage(
    {
      body: parsed.body as Buffer | ReadableStream | string,
      contentType: parsed.contentType,
      key: storageKey,
    },
    storageDeps,
  );

  const [file] = await db
    .insert(s.driveFile)
    .values({
      contentType: parsed.contentType,
      description: parsed.description ?? null,
      etag: fileObject.etag,
      folderId,
      name: parsed.name,
      ownerId: parsed.ownerId,
      path,
      size: fileObject.size,
      storageKey,
    })
    .returning();

  if (!file) {
    throw new Error("Failed to upload file.");
  }

  await pubsub.publish(DRIVE_EVENTS.FILE_UPLOADED, {
    file: {
      contentType: file.contentType,
      etag: file.etag,
      folderId: file.folderId,
      id: file.id,
      name: file.name,
      ownerId: file.ownerId,
      path: file.path,
      size: file.size,
      storageKey: file.storageKey,
      version: file.version,
    },
  });

  return file;
}

export async function downloadFile(
  {
    id,
    userId,
    options,
  }: { id: string; userId: string; options?: DownloadLinkOptions },
  { db, pubsub, storageDeps, config }: FileDeps,
) {
  const file = await getFileById({ id }, { db });
  const parsed = parse(DownloadLinkOptionsSchema, options ?? {});

  const expiresIn = Math.min(
    parsed.expiresIn ?? config.defaultDownloadLinkExpiry,
    config.maxDownloadLinkExpiry,
  );

  const url = await getSignedGetUrl(
    { expiresIn, key: file.storageKey },
    storageDeps,
  );

  await pubsub.publish(DRIVE_EVENTS.FILE_DOWNLOADED, {
    file: {
      id: file.id,
      name: file.name,
      ownerId: file.ownerId,
    },
    userId,
  });

  return { file, url };
}

export async function getFileById({ id }: { id: string }, { db }: { db: DB }) {
  const [file] = await db
    .select()
    .from(s.driveFile)
    .where(eq(s.driveFile.id, id))
    .limit(1);

  if (!file) {
    throw new Error(`File with id "${id}" not found.`);
  }

  return file;
}

export async function getFile({ id }: { id: string }, deps: FileDeps) {
  return getFileById({ id }, deps);
}

export async function updateFile(
  { id, input }: { id: string; input: UpdateFileInput },
  { db, pubsub, storageDeps, config }: FileDeps,
) {
  const file = await getFileById({ id }, { db });
  const parsed = parse(UpdateFileSchema, input);

  await db.insert(s.driveFileVersion).values({
    contentType: file.contentType,
    etag: file.etag,
    fileId: file.id,
    size: file.size,
    storageKey: file.storageKey,
    uploadedBy: parsed.uploadedBy,
    version: file.version,
  });

  const contentType = parsed.contentType ?? file.contentType;
  const storageKey = computeStorageKey({
    fileName: file.name,
    folderPath: file.path.substring(0, file.path.lastIndexOf("/")) || "/",
  });

  const fileObject = await uploadStorage(
    {
      body: parsed.body as Buffer | ReadableStream | string,
      contentType,
      key: storageKey,
    },
    storageDeps,
  );

  const [updated] = await db
    .update(s.driveFile)
    .set({
      contentType,
      etag: fileObject.etag,
      size: fileObject.size,
      storageKey,
      updatedAt: new Date(),
      version: file.version + 1,
    })
    .where(eq(s.driveFile.id, id))
    .returning();

  if (!updated) {
    throw new Error(`File with id "${id}" not found.`);
  }

  await pruneOldVersions({ fileId: id }, { config, db, storageDeps });

  await pubsub.publish(DRIVE_EVENTS.FILE_UPDATED, {
    file: {
      contentType: updated.contentType,
      etag: updated.etag,
      id: updated.id,
      name: updated.name,
      ownerId: updated.ownerId,
      path: updated.path,
      size: updated.size,
      storageKey: updated.storageKey,
      version: updated.version,
    },
    previousVersion: file.version,
  });

  return updated;
}

export async function deleteFile(
  { id }: { id: string },
  { db, pubsub }: FileDeps,
) {
  await getFileById({ id }, { db });

  const [updated] = await db
    .update(s.driveFile)
    .set({
      isTrashed: true,
      trashedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(s.driveFile.id, id))
    .returning();

  if (!updated) {
    throw new Error(`File with id "${id}" not found.`);
  }

  await pubsub.publish(DRIVE_EVENTS.TRASHED, {
    itemId: id,
    itemType: "file",
  });

  return updated;
}

export async function restoreFile(
  { id }: { id: string },
  { db, pubsub }: FileDeps,
) {
  const file = await getFileById({ id }, { db });

  if (file.folderId) {
    const [folder] = await db
      .select({
        id: s.driveFolder.id,
        isTrashed: s.driveFolder.isTrashed,
      })
      .from(s.driveFolder)
      .where(eq(s.driveFolder.id, file.folderId))
      .limit(1);

    if (!folder || folder.isTrashed) {
      await db
        .update(s.driveFile)
        .set({ folderId: null, updatedAt: new Date() })
        .where(eq(s.driveFile.id, id));
    }
  }

  const [updated] = await db
    .update(s.driveFile)
    .set({
      isTrashed: false,
      trashedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(s.driveFile.id, id))
    .returning();

  if (!updated) {
    throw new Error(`File with id "${id}" not found.`);
  }

  await pubsub.publish(DRIVE_EVENTS.RESTORED, {
    itemId: id,
    itemType: "file",
  });

  return updated;
}

export async function moveFile(
  { id, input }: { id: string; input: MoveFileInput },
  { db, pathDeps, pubsub, storageDeps }: FileDeps,
) {
  const file = await getFileById({ id }, { db });
  const parsed = parse(MoveFileSchema, input);
  const newFolderId = parsed.newFolderId ?? null;

  await checkNameUniqueness(
    { excludeId: id, name: file.name, parentId: newFolderId },
    pathDeps,
  );

  const oldPath = file.path;
  const newPath = await computeFilePath(
    { folderId: newFolderId, name: file.name },
    pathDeps,
  );

  const newFolderPath = newFolderId
    ? await getFolderPath({ folderId: newFolderId }, pathDeps)
    : "";
  const newStorageKey = computeStorageKey({
    fileName: file.name,
    folderPath: newFolderPath,
  });

  await moveStorage(
    { destKey: newStorageKey, sourceKey: file.storageKey },
    storageDeps,
  );

  const [updated] = await db
    .update(s.driveFile)
    .set({
      folderId: newFolderId,
      path: newPath,
      storageKey: newStorageKey,
      updatedAt: new Date(),
    })
    .where(eq(s.driveFile.id, id))
    .returning();

  if (!updated) {
    throw new Error(`File with id "${id}" not found.`);
  }

  await pubsub.publish(DRIVE_EVENTS.MOVED, {
    item: {
      id: updated.id,
      name: updated.name,
      path: updated.path,
    },
    itemType: "file",
    newPath,
    oldPath,
  });

  return updated;
}

export async function renameFile(
  { id, input }: { id: string; input: RenameFileInput },
  { db, pathDeps, pubsub }: FileDeps,
) {
  const file = await getFileById({ id }, { db });
  const parsed = parse(RenameFileSchema, input);

  await checkNameUniqueness(
    { excludeId: id, name: parsed.name, parentId: file.folderId },
    pathDeps,
  );

  const oldPath = file.path;
  const newPath = await computeFilePath(
    { folderId: file.folderId, name: parsed.name },
    pathDeps,
  );

  const [updated] = await db
    .update(s.driveFile)
    .set({
      name: parsed.name,
      path: newPath,
      updatedAt: new Date(),
    })
    .where(eq(s.driveFile.id, id))
    .returning();

  if (!updated) {
    throw new Error(`File with id "${id}" not found.`);
  }

  await pubsub.publish(DRIVE_EVENTS.MOVED, {
    item: {
      id: updated.id,
      name: updated.name,
      path: updated.path,
    },
    itemType: "file",
    newPath,
    oldPath,
  });

  return updated;
}

export async function listFileVersions(
  { id }: { id: string },
  { db }: FileDeps,
) {
  await getFileById({ id }, { db });

  return db
    .select()
    .from(s.driveFileVersion)
    .where(eq(s.driveFileVersion.fileId, id))
    .orderBy(desc(s.driveFileVersion.version));
}

export async function getFileDownloadLink(
  { id, options }: { id: string; options?: DownloadLinkOptions },
  { db, storageDeps, config }: FileDeps,
) {
  const file = await getFileById({ id }, { db });
  const parsed = parse(DownloadLinkOptionsSchema, options ?? {});

  const expiresIn = Math.min(
    parsed.expiresIn ?? config.defaultDownloadLinkExpiry,
    config.maxDownloadLinkExpiry,
  );

  const url = await getSignedGetUrl(
    { expiresIn, key: file.storageKey },
    storageDeps,
  );

  return { file, url };
}

export async function copyFile(
  { id, destFolderId }: { id: string; destFolderId?: string | null },
  { db, pathDeps, storageDeps }: FileDeps,
) {
  const file = await getFileById({ id }, { db });

  const folderId = destFolderId ?? null;
  const newPath = await computeFilePath(
    { folderId, name: file.name },
    pathDeps,
  );

  await checkNameUniqueness({ name: file.name, parentId: folderId }, pathDeps);

  const folderPath = folderId
    ? await getFolderPath({ folderId }, pathDeps)
    : "";
  const newStorageKey = computeStorageKey({
    fileName: file.name,
    folderPath,
  });

  await copyStorage(
    { destKey: newStorageKey, sourceKey: file.storageKey },
    storageDeps,
  );

  const [copied] = await db
    .insert(s.driveFile)
    .values({
      contentType: file.contentType,
      description: file.description,
      etag: file.etag,
      folderId,
      name: file.name,
      ownerId: file.ownerId,
      path: newPath,
      size: file.size,
      storageKey: newStorageKey,
    })
    .returning();

  if (!copied) {
    throw new Error("Failed to copy file.");
  }

  return copied;
}

export async function purgeFile(
  { id }: { id: string },
  { db, pubsub, storageDeps }: FileDeps,
): Promise<void> {
  const file = await getFileById({ id }, { db });

  await removeStorage({ key: file.storageKey }, storageDeps);

  const versions = await db
    .select({ storageKey: s.driveFileVersion.storageKey })
    .from(s.driveFileVersion)
    .where(eq(s.driveFileVersion.fileId, id));

  for (const v of versions) {
    await removeStorage({ key: v.storageKey }, storageDeps);
  }

  await db.delete(s.driveFileVersion).where(eq(s.driveFileVersion.fileId, id));

  await db.delete(s.driveFile).where(eq(s.driveFile.id, id));

  await pubsub.publish(DRIVE_EVENTS.PURGED, {
    itemId: id,
    itemType: "file",
    storageKey: file.storageKey,
  });
}

async function pruneOldVersions(
  { fileId }: { fileId: string },
  {
    config,
    db,
    storageDeps,
  }: {
    config: FileWorkflowConfig;
    db: DB;
    storageDeps: StorageBridgeDeps;
  },
): Promise<void> {
  const versions = await db
    .select({
      id: s.driveFileVersion.id,
      storageKey: s.driveFileVersion.storageKey,
      version: s.driveFileVersion.version,
    })
    .from(s.driveFileVersion)
    .where(eq(s.driveFileVersion.fileId, fileId))
    .orderBy(desc(s.driveFileVersion.version));

  if (versions.length <= config.maxVersions) return;

  const toPrune = versions.slice(config.maxVersions);

  for (const v of toPrune) {
    await removeStorage({ key: v.storageKey }, storageDeps);
    await db.delete(s.driveFileVersion).where(eq(s.driveFileVersion.id, v.id));
  }
}
