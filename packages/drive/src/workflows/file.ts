import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { number, object, optional, parse, string } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import { getDriveConfig } from "../runtime";
import {
  checkNameUniqueness,
  computeFilePath,
  getFolderPath,
} from "../services/path-service";
import {
  computeStorageKey,
  copy as copyStorage,
  getSignedGetUrl,
  move as moveStorage,
  remove as removeStorage,
  upload as uploadStorage,
} from "../services/storage-bridge";
import {
  MoveFileSchema,
  RenameFileSchema,
  UpdateFileSchema,
  UploadFileSchema,
} from "../types";

type DB = NodePgDatabase<Record<string, never>>;

const UploadInputSchema = object({ input: UploadFileSchema });
const FileIdSchema = string();
const WithFileIdSchema = object({ id: FileIdSchema });
const UpdateInputSchema = object({ id: FileIdSchema, input: UpdateFileSchema });
const RenameInputSchema = object({ id: FileIdSchema, input: RenameFileSchema });
const MoveInputSchema = object({ id: FileIdSchema, input: MoveFileSchema });
const DownloadInputSchema = object({
  id: FileIdSchema,
  options: optional(object({ expiresIn: optional(number()) })),
});
const CopyInputSchema = object({
  destFolderId: optional(string()),
  id: FileIdSchema,
});

export const uploadFile = Workflow.name("drive.file.upload")
  .input(UploadInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UploadFileSchema, input);
    const folderId = parsed.folderId ?? null;

    const path = await ctx.step.run("compute-path", async () =>
      computeFilePath({ folderId, name: parsed.name }),
    );

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({ name: parsed.name, parentId: folderId });
    });

    const folderPath = folderId
      ? await ctx.step.run("get-folder-path", async () =>
          getFolderPath({ folderId }),
        )
      : "";

    const storageKey = computeStorageKey({ fileName: parsed.name, folderPath });

    const fileObject = await ctx.step.run("upload-storage", async () => {
      return uploadStorage({
        body: parsed.body as Buffer | ReadableStream | string,
        contentType: parsed.contentType,
        key: storageKey,
      });
    });

    const [file] = await ctx.db
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

    await ctx.pubsub.publish(DRIVE_EVENTS.FILE_UPLOADED, {
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
  });

export const downloadFile = Workflow.name("drive.file.download")
  .input(DownloadInputSchema)
  .handler(async ({ id, options = {} }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });
    const config = getDriveConfig();

    const expiresIn = Math.min(
      options.expiresIn ?? config.defaultDownloadLinkExpiry,
      config.maxDownloadLinkExpiry,
    );

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({ expiresIn, key: file.storageKey }),
    );

    await ctx.pubsub.publish(DRIVE_EVENTS.FILE_DOWNLOADED, {
      file: {
        id: file.id,
        name: file.name,
        ownerId: file.ownerId,
      },
      userId: ctx.actorId ?? "",
    });

    return { file, url };
  });

export const getFileById = Workflow.name("drive.file.get-by-id")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    const [file] = await ctx.db
      .select()
      .from(s.driveFile)
      .where(eq(s.driveFile.id, id))
      .limit(1);

    if (!file) {
      throw new Error(`File with id "${id}" not found.`);
    }

    return file;
  });

export const getFile = getFileById;

export const updateFile = Workflow.name("drive.file.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });
    const parsed = parse(UpdateFileSchema, input);
    const config = getDriveConfig();

    await ctx.step.run("save-version", async () => {
      await ctx.db.insert(s.driveFileVersion).values({
        contentType: file.contentType,
        etag: file.etag,
        fileId: file.id,
        size: file.size,
        storageKey: file.storageKey,
        uploadedBy: parsed.uploadedBy,
        version: file.version,
      });
    });

    const contentType = parsed.contentType ?? file.contentType;
    const storageKey = computeStorageKey({
      fileName: file.name,
      folderPath: file.path.substring(0, file.path.lastIndexOf("/")) || "/",
    });

    const fileObject = await ctx.step.run("upload-storage", async () => {
      return uploadStorage({
        body: parsed.body as Buffer | ReadableStream | string,
        contentType,
        key: storageKey,
      });
    });

    const [updated] = await ctx.db
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

    await ctx.step.run("prune-old-versions", async () => {
      await pruneOldVersions(ctx.db, id, config.maxVersions);
    });

    await ctx.pubsub.publish(DRIVE_EVENTS.FILE_UPDATED, {
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
  });

export const deleteFile = Workflow.name("drive.file.delete")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select({ id: s.driveFile.id })
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });

    const [updated] = await ctx.db
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

    await ctx.pubsub.publish(DRIVE_EVENTS.TRASHED, {
      itemId: id,
      itemType: "file",
    });

    return updated;
  });

export const restoreFile = Workflow.name("drive.file.restore")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });

    if (file.folderId) {
      const [folder] = await ctx.db
        .select({
          id: s.driveFolder.id,
          isTrashed: s.driveFolder.isTrashed,
        })
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, file.folderId))
        .limit(1);

      if (!folder || folder.isTrashed) {
        await ctx.db
          .update(s.driveFile)
          .set({ folderId: null, updatedAt: new Date() })
          .where(eq(s.driveFile.id, id));
      }
    }

    const [updated] = await ctx.db
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

    await ctx.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "file",
    });

    return updated;
  });

export const moveFile = Workflow.name("drive.file.move")
  .input(MoveInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });
    const parsed = parse(MoveFileSchema, input);
    const newFolderId = parsed.newFolderId ?? null;

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({
        excludeId: id,
        name: file.name,
        parentId: newFolderId,
      });
    });

    const oldPath = file.path;
    const newPath = await ctx.step.run("compute-path", async () =>
      computeFilePath({ folderId: newFolderId, name: file.name }),
    );

    const newFolderPath = newFolderId
      ? await ctx.step.run("get-folder-path", async () =>
          getFolderPath({ folderId: newFolderId }),
        )
      : "";
    const newStorageKey = computeStorageKey({
      fileName: file.name,
      folderPath: newFolderPath,
    });

    await ctx.step.run("move-storage", async () => {
      await moveStorage({
        destKey: newStorageKey,
        sourceKey: file.storageKey,
      });
    });

    const [updated] = await ctx.db
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

    await ctx.pubsub.publish(DRIVE_EVENTS.MOVED, {
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
  });

export const renameFile = Workflow.name("drive.file.rename")
  .input(RenameInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });
    const parsed = parse(RenameFileSchema, input);

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({
        excludeId: id,
        name: parsed.name,
        parentId: file.folderId,
      });
    });

    const oldPath = file.path;
    const newPath = await ctx.step.run("compute-path", async () =>
      computeFilePath({ folderId: file.folderId, name: parsed.name }),
    );

    const [updated] = await ctx.db
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

    await ctx.pubsub.publish(DRIVE_EVENTS.MOVED, {
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
  });

export const listFileVersions = Workflow.name("drive.file.list-versions")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select({ id: s.driveFile.id })
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });

    return ctx.db
      .select()
      .from(s.driveFileVersion)
      .where(eq(s.driveFileVersion.fileId, id))
      .orderBy(desc(s.driveFileVersion.version));
  });

export const getFileDownloadLink = Workflow.name("drive.file.download-link")
  .input(DownloadInputSchema)
  .handler(async ({ id, options = {} }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });
    const config = getDriveConfig();

    const expiresIn = Math.min(
      options.expiresIn ?? config.defaultDownloadLinkExpiry,
      config.maxDownloadLinkExpiry,
    );

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({ expiresIn, key: file.storageKey }),
    );

    return { file, url };
  });

export const copyFile = Workflow.name("drive.file.copy")
  .input(CopyInputSchema)
  .handler(async ({ id, destFolderId }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });

    const folderId = destFolderId ?? null;
    const newPath = await ctx.step.run("compute-path", async () =>
      computeFilePath({ folderId, name: file.name }),
    );

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({ name: file.name, parentId: folderId });
    });

    const folderPath = folderId
      ? await ctx.step.run("get-folder-path", async () =>
          getFolderPath({ folderId }),
        )
      : "";
    const newStorageKey = computeStorageKey({
      fileName: file.name,
      folderPath,
    });

    await ctx.step.run("copy-storage", async () => {
      await copyStorage({
        destKey: newStorageKey,
        sourceKey: file.storageKey,
      });
    });

    const [copied] = await ctx.db
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
  });

export const purgeFile = Workflow.name("drive.file.purge")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFile)
        .where(eq(s.driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });

    await ctx.step.run("remove-storage", async () => {
      await removeStorage({ key: file.storageKey });
    });

    const versions = await ctx.db
      .select({ storageKey: s.driveFileVersion.storageKey })
      .from(s.driveFileVersion)
      .where(eq(s.driveFileVersion.fileId, id));

    for (const v of versions) {
      await ctx.step.run("remove-version-storage", async () => {
        await removeStorage({ key: v.storageKey });
      });
    }

    await ctx.db
      .delete(s.driveFileVersion)
      .where(eq(s.driveFileVersion.fileId, id));

    await ctx.db.delete(s.driveFile).where(eq(s.driveFile.id, id));

    await ctx.pubsub.publish(DRIVE_EVENTS.PURGED, {
      itemId: id,
      itemType: "file",
      storageKey: file.storageKey,
    });
  });

async function pruneOldVersions(
  db: DB,
  fileId: string,
  maxVersions: number,
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

  if (versions.length <= maxVersions) return;

  const toPrune = versions.slice(maxVersions);

  for (const v of toPrune) {
    await removeStorage({ key: v.storageKey });
    await db.delete(s.driveFileVersion).where(eq(s.driveFileVersion.id, v.id));
  }
}

export const files = {
  copy: copyFile,
  delete: deleteFile,
  download: downloadFile,
  get: getFile,
  getById: getFileById,
  getDownloadLink: getFileDownloadLink,
  listVersions: listFileVersions,
  move: moveFile,
  purge: purgeFile,
  rename: renameFile,
  restore: restoreFile,
  update: updateFile,
  upload: uploadFile,
};
