import type { PubSubUnit } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { driveFile, driveFileVersion, driveFolder } from "../db-schema";
import { DRIVE_EVENTS } from "../event-map";
import type { PathService } from "../services/path-service";
import type { StorageBridge } from "../services/storage-bridge";
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

export class FileWorkflow {
  constructor(
    private db: DB,
    private storageBridge: StorageBridge,
    private pathService: PathService,
    private pubsub: PubSubUnit,
    private config: FileWorkflowConfig,
  ) {}

  async upload(input: UploadFileInput) {
    const parsed = parse(UploadFileSchema, input);
    const folderId = parsed.folderId ?? null;

    const path = await this.pathService.computeFilePath(parsed.name, folderId);

    await this.pathService.checkNameUniqueness(parsed.name, folderId);

    const folderPath = folderId
      ? await this.pathService.getFolderPath(folderId)
      : "";

    const storageKey = this.storageBridge.computeStorageKey(
      folderPath,
      parsed.name,
    );

    const fileObject = await this.storageBridge.upload({
      body: parsed.body as Buffer | ReadableStream | string,
      contentType: parsed.contentType,
      key: storageKey,
    });

    const [file] = await this.db
      .insert(driveFile)
      .values({
        contentType: parsed.contentType,
        description: parsed.description ?? null,
        etag: fileObject.etag ?? null,
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

    await this.pubsub.publish(DRIVE_EVENTS.FILE_UPLOADED, {
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

  async download(id: string, userId: string, options?: DownloadLinkOptions) {
    const file = await this.getById(id);
    const parsed = parse(DownloadLinkOptionsSchema, options ?? {});

    const expiresIn = Math.min(
      parsed.expiresIn ?? this.config.defaultDownloadLinkExpiry,
      this.config.maxDownloadLinkExpiry,
    );

    const url = await this.storageBridge.getSignedGetUrl(
      file.storageKey,
      expiresIn,
    );

    await this.pubsub.publish(DRIVE_EVENTS.FILE_DOWNLOADED, {
      file: {
        id: file.id,
        name: file.name,
        ownerId: file.ownerId,
      },
      userId,
    });

    return { file, url };
  }

  async getById(id: string) {
    const [file] = await this.db
      .select()
      .from(driveFile)
      .where(eq(driveFile.id, id))
      .limit(1);

    if (!file) {
      throw new Error(`File with id "${id}" not found.`);
    }

    return file;
  }

  async get(id: string) {
    return this.getById(id);
  }

  async update(id: string, input: UpdateFileInput) {
    const file = await this.getById(id);
    const parsed = parse(UpdateFileSchema, input);

    await this.db.insert(driveFileVersion).values({
      contentType: file.contentType,
      etag: file.etag,
      fileId: file.id,
      size: file.size,
      storageKey: file.storageKey,
      uploadedBy: parsed.uploadedBy,
      version: file.version,
    });

    const contentType = parsed.contentType ?? file.contentType;
    const storageKey = this.storageBridge.computeStorageKey(
      file.path.substring(0, file.path.lastIndexOf("/")) || "/",
      file.name,
    );

    const fileObject = await this.storageBridge.upload({
      body: parsed.body as Buffer | ReadableStream | string,
      contentType,
      key: storageKey,
    });

    const [updated] = await this.db
      .update(driveFile)
      .set({
        contentType,
        etag: fileObject.etag ?? null,
        size: fileObject.size,
        storageKey,
        updatedAt: new Date(),
        version: file.version + 1,
      })
      .where(eq(driveFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await this.pruneOldVersions(id);

    await this.pubsub.publish(DRIVE_EVENTS.FILE_UPDATED, {
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

  async delete(id: string) {
    await this.getById(id);

    const [updated] = await this.db
      .update(driveFile)
      .set({
        isTrashed: true,
        trashedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(driveFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await this.pubsub.publish(DRIVE_EVENTS.TRASHED, {
      itemId: id,
      itemType: "file",
    });

    return updated;
  }

  async restore(id: string) {
    const file = await this.getById(id);

    if (file.folderId) {
      const [folder] = await this.db
        .select({
          id: driveFolder.id,
          isTrashed: driveFolder.isTrashed,
        })
        .from(driveFolder)
        .where(eq(driveFolder.id, file.folderId))
        .limit(1);

      if (!folder || folder.isTrashed) {
        await this.db
          .update(driveFile)
          .set({ folderId: null, updatedAt: new Date() })
          .where(eq(driveFile.id, id));
      }
    }

    const [updated] = await this.db
      .update(driveFile)
      .set({
        isTrashed: false,
        trashedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(driveFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await this.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "file",
    });

    return updated;
  }

  async move(id: string, input: MoveFileInput) {
    const file = await this.getById(id);
    const parsed = parse(MoveFileSchema, input);
    const newFolderId = parsed.newFolderId ?? null;

    await this.pathService.checkNameUniqueness(file.name, newFolderId, id);

    const oldPath = file.path;
    const newPath = await this.pathService.computeFilePath(
      file.name,
      newFolderId,
    );

    const newFolderPath = newFolderId
      ? await this.pathService.getFolderPath(newFolderId)
      : "";
    const newStorageKey = this.storageBridge.computeStorageKey(
      newFolderPath,
      file.name,
    );

    await this.storageBridge.move(file.storageKey, newStorageKey);

    const [updated] = await this.db
      .update(driveFile)
      .set({
        folderId: newFolderId,
        path: newPath,
        storageKey: newStorageKey,
        updatedAt: new Date(),
      })
      .where(eq(driveFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await this.pubsub.publish(DRIVE_EVENTS.MOVED, {
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

  async rename(id: string, input: RenameFileInput) {
    const file = await this.getById(id);
    const parsed = parse(RenameFileSchema, input);

    await this.pathService.checkNameUniqueness(parsed.name, file.folderId, id);

    const oldPath = file.path;
    const newPath = await this.pathService.computeFilePath(
      parsed.name,
      file.folderId,
    );

    const [updated] = await this.db
      .update(driveFile)
      .set({
        name: parsed.name,
        path: newPath,
        updatedAt: new Date(),
      })
      .where(eq(driveFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await this.pubsub.publish(DRIVE_EVENTS.MOVED, {
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

  async listVersions(id: string) {
    await this.getById(id);

    return this.db
      .select()
      .from(driveFileVersion)
      .where(eq(driveFileVersion.fileId, id))
      .orderBy(desc(driveFileVersion.version));
  }

  async getDownloadLink(id: string, options?: DownloadLinkOptions) {
    const file = await this.getById(id);
    const parsed = parse(DownloadLinkOptionsSchema, options ?? {});

    const expiresIn = Math.min(
      parsed.expiresIn ?? this.config.defaultDownloadLinkExpiry,
      this.config.maxDownloadLinkExpiry,
    );

    const url = await this.storageBridge.getSignedGetUrl(
      file.storageKey,
      expiresIn,
    );

    return { file, url };
  }

  async copy(id: string, destFolderId?: string | null) {
    const file = await this.getById(id);

    const folderId = destFolderId ?? null;
    const newPath = await this.pathService.computeFilePath(file.name, folderId);

    await this.pathService.checkNameUniqueness(file.name, folderId);

    const folderPath = folderId
      ? await this.pathService.getFolderPath(folderId)
      : "";
    const newStorageKey = this.storageBridge.computeStorageKey(
      folderPath,
      file.name,
    );

    await this.storageBridge.copy(file.storageKey, newStorageKey);

    const [copied] = await this.db
      .insert(driveFile)
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

  async purge(id: string): Promise<void> {
    const file = await this.getById(id);

    await this.storageBridge.remove(file.storageKey);

    const versions = await this.db
      .select({ storageKey: driveFileVersion.storageKey })
      .from(driveFileVersion)
      .where(eq(driveFileVersion.fileId, id));

    for (const v of versions) {
      await this.storageBridge.remove(v.storageKey);
    }

    await this.db
      .delete(driveFileVersion)
      .where(eq(driveFileVersion.fileId, id));

    await this.db.delete(driveFile).where(eq(driveFile.id, id));

    await this.pubsub.publish(DRIVE_EVENTS.PURGED, {
      itemId: id,
      itemType: "file",
      storageKey: file.storageKey,
    });
  }

  private async pruneOldVersions(fileId: string): Promise<void> {
    const versions = await this.db
      .select({
        id: driveFileVersion.id,
        storageKey: driveFileVersion.storageKey,
        version: driveFileVersion.version,
      })
      .from(driveFileVersion)
      .where(eq(driveFileVersion.fileId, fileId))
      .orderBy(desc(driveFileVersion.version));

    if (versions.length <= this.config.maxVersions) return;

    const toPrune = versions.slice(this.config.maxVersions);

    for (const v of toPrune) {
      await this.storageBridge.remove(v.storageKey);
      await this.db
        .delete(driveFileVersion)
        .where(eq(driveFileVersion.id, v.id));
    }
  }
}
