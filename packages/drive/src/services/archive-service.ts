import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as s from "../db-schema";
import type { FolderDownloadLinkOptions } from "../types";
import {
  computeArchiveKey,
  get,
  getSignedGetUrl,
  type StorageBridgeDeps,
  upload,
} from "./storage-bridge";

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

export interface ArchiveServiceDeps {
  db: DB;
  storageDeps: StorageBridgeDeps;
}

export async function createArchive(
  {
    folderId,
    options,
  }: { folderId: string; options?: FolderDownloadLinkOptions },
  deps: ArchiveServiceDeps,
): Promise<ArchiveResult> {
  const [folder] = await deps.db
    .select()
    .from(s.driveFolder)
    .where(eq(s.driveFolder.id, folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${folderId}" not found.`);
  }

  const includeSubfolders = options?.includeSubfolders ?? true;
  const files = await collectFiles(
    { folderPath: folder.path, includeSubfolders },
    deps,
  );

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (
    files.length > LARGE_FOLDER_FILE_THRESHOLD ||
    totalSize > LARGE_FOLDER_SIZE_THRESHOLD
  ) {
    throw new ArchiveTooLargeError(folderId, files.length, totalSize);
  }

  return generateZip(
    {
      expiresIn: options?.expiresIn,
      files,
      folderName: folder.name,
      folderPath: folder.path,
    },
    deps,
  );
}

export async function processArchiveJob(
  data: ArchiveJobData,
  deps: ArchiveServiceDeps,
): Promise<ArchiveResult> {
  const [folder] = await deps.db
    .select()
    .from(s.driveFolder)
    .where(eq(s.driveFolder.id, data.folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${data.folderId}" not found.`);
  }

  const files = await collectFiles(
    { folderPath: folder.path, includeSubfolders: data.includeSubfolders },
    deps,
  );
  return generateZip(
    { files, folderName: folder.name, folderPath: folder.path },
    deps,
  );
}

async function collectFiles(
  {
    folderPath,
    includeSubfolders,
  }: { folderPath: string; includeSubfolders: boolean },
  deps: ArchiveServiceDeps,
): Promise<(typeof s.driveFile.$inferSelect)[]> {
  if (includeSubfolders) {
    return deps.db
      .select()
      .from(s.driveFile)
      .where(
        sql`${s.driveFile.path} like ${`${folderPath}/%`} AND ${s.driveFile.isTrashed} = false`,
      );
  }

  return deps.db
    .select()
    .from(s.driveFile)
    .where(
      sql`${s.driveFile.folderId} = (
        SELECT id FROM drive_folder WHERE path = ${folderPath}
      ) AND ${s.driveFile.isTrashed} = false`,
    );
}

async function generateZip(
  {
    expiresIn,
    files,
    folderName,
    folderPath,
  }: {
    expiresIn?: number;
    files: (typeof s.driveFile.$inferSelect)[];
    folderName: string;
    folderPath: string;
  },
  deps: ArchiveServiceDeps,
): Promise<ArchiveResult> {
  const { zipSync, strToU8 } = await import("fflate");

  const zipEntries: Record<string, Uint8Array> = {};
  const basePathLength = folderPath.length;

  for (const file of files) {
    const data = await get({ key: file.storageKey }, deps.storageDeps);
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
  const archiveKey = computeArchiveKey({ folderId: folderName });
  await upload(
    {
      body: Buffer.from(zipData),
      contentType: "application/zip",
      key: archiveKey,
    },
    deps.storageDeps,
  );

  const url = await getSignedGetUrl(
    { expiresIn, key: archiveKey },
    deps.storageDeps,
  );

  return { key: archiveKey, url };
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
