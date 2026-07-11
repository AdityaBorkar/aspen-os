import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { driveFile, driveFolder } from "../db-schema";
import type { FolderDownloadLinkOptions } from "../types";
import type { StorageBridge } from "./storage-bridge";

type DB = NodePgDatabase<Record<string, never>>;

const LARGE_FOLDER_FILE_THRESHOLD = 1000;
const LARGE_FOLDER_SIZE_THRESHOLD = 1024 * 1024 * 1024;

export interface ArchiveResult {
  key: string;
  url: string;
}

export interface ArchiveJobData {
  folderId: string;
  includeSubfolders: boolean;
}

export class ArchiveService {
  constructor(
    private db: DB,
    private storageBridge: StorageBridge,
  ) {}

  async createArchive(
    folderId: string,
    options?: FolderDownloadLinkOptions,
  ): Promise<ArchiveResult> {
    const [folder] = await this.db
      .select()
      .from(driveFolder)
      .where(eq(driveFolder.id, folderId))
      .limit(1);

    if (!folder) {
      throw new Error(`Folder "${folderId}" not found.`);
    }

    const includeSubfolders = options?.includeSubfolders ?? true;
    const files = await this.collectFiles(folder.path, includeSubfolders);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (
      files.length > LARGE_FOLDER_FILE_THRESHOLD ||
      totalSize > LARGE_FOLDER_SIZE_THRESHOLD
    ) {
      throw new ArchiveTooLargeError(folderId, files.length, totalSize);
    }

    return this.generateZip(
      folder.name,
      folder.path,
      files,
      options?.expiresIn,
    );
  }

  async processArchiveJob(data: ArchiveJobData): Promise<ArchiveResult> {
    const [folder] = await this.db
      .select()
      .from(driveFolder)
      .where(eq(driveFolder.id, data.folderId))
      .limit(1);

    if (!folder) {
      throw new Error(`Folder "${data.folderId}" not found.`);
    }

    const files = await this.collectFiles(folder.path, data.includeSubfolders);
    return this.generateZip(folder.name, folder.path, files);
  }

  private async collectFiles(
    folderPath: string,
    includeSubfolders: boolean,
  ): Promise<(typeof driveFile.$inferSelect)[]> {
    if (includeSubfolders) {
      return this.db
        .select()
        .from(driveFile)
        .where(
          sql`${driveFile.path} like ${`${folderPath}/%`} AND ${driveFile.isTrashed} = false`,
        );
    }

    return this.db
      .select()
      .from(driveFile)
      .where(
        sql`${driveFile.folderId} = (
          SELECT id FROM drive_folder WHERE path = ${folderPath}
        ) AND ${driveFile.isTrashed} = false`,
      );
  }

  private async generateZip(
    folderName: string,
    folderPath: string,
    files: (typeof driveFile.$inferSelect)[],
    expiresIn?: number,
  ): Promise<ArchiveResult> {
    const { zipSync, strToU8 } = await import("fflate");

    const zipEntries: Record<string, Uint8Array> = {};
    const basePathLength = folderPath.length;

    for (const file of files) {
      const data = await this.storageBridge.get(file.storageKey);
      const relativePath = file.path.slice(basePathLength + 1);
      zipEntries[relativePath] = new Uint8Array(data);
    }

    const manifest = strToU8(
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          fileCount: files.length,
          folderName,
        },
        null,
        2,
      ),
    );
    zipEntries["_manifest.json"] = manifest;

    const zipData = zipSync(zipEntries);
    const archiveKey = this.storageBridge.computeArchiveKey(folderName);
    await this.storageBridge.upload({
      body: Buffer.from(zipData),
      contentType: "application/zip",
      key: archiveKey,
    });

    const url = await this.storageBridge.getSignedGetUrl(archiveKey, expiresIn);

    return { key: archiveKey, url };
  }
}

export class ArchiveTooLargeError extends Error {
  constructor(
    public folderId: string,
    public fileCount: number,
    public totalSize: number,
  ) {
    super(
      `Folder "${folderId}" is too large for synchronous archive: ` +
        `${fileCount} files, ${totalSize} bytes. Use async job instead.`,
    );
    this.name = "ArchiveTooLargeError";
  }
}
