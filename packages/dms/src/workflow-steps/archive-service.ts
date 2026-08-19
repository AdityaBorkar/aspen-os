import * as schemas from "#/db-schemas";
import { computeArchiveKey, get, getSignedGetUrl, upload } from "#/services/storage-bridge";
import type { FolderDownloadLinkOptions } from "#/types";
import { promisify } from "node:util";

import { getContext } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";

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

export async function createArchive({
  folderId,
  options,
}: {
  folderId: string;
  options?: FolderDownloadLinkOptions;
}): Promise<ArchiveResult> {
  const { db } = getContext();
  const [folder] = await db
    .select()
    .from(schemas.dmsFolder)
    .where(eq(schemas.dmsFolder.id, folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${folderId}" not found.`);
  }

  const includeSubfolders = options?.includeSubfolders ?? true;
  const files = await collectFiles({
    folderPath: folder.path,
    includeSubfolders,
  });

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (files.length > LARGE_FOLDER_FILE_THRESHOLD || totalSize > LARGE_FOLDER_SIZE_THRESHOLD) {
    throw new ArchiveTooLargeError(folderId, files.length, totalSize);
  }

  return generateZip({
    expiresIn: options?.expiresIn,
    files,
    folderName: folder.name,
    folderPath: folder.path,
  });
}

export async function processArchiveJob(data: ArchiveJobData): Promise<ArchiveResult> {
  const { db } = getContext();
  const [folder] = await db
    .select()
    .from(schemas.dmsFolder)
    .where(eq(schemas.dmsFolder.id, data.folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${data.folderId}" not found.`);
  }

  const files = await collectFiles({
    folderPath: folder.path,
    includeSubfolders: data.includeSubfolders,
  });
  return generateZip({
    files,
    folderName: folder.name,
    folderPath: folder.path,
  });
}

async function collectFiles({
  folderPath,
  includeSubfolders,
}: {
  folderPath: string;
  includeSubfolders: boolean;
}): Promise<(typeof schemas.dmsFile.$inferSelect)[]> {
  const { db } = getContext();
  if (includeSubfolders) {
    return db
      .select()
      .from(schemas.dmsFile)
      .where(
        sql`${schemas.dmsFile.path} like ${`${folderPath}/%`} AND ${schemas.dmsFile.status} != 'trashed'`,
      );
  }

  return db
    .select()
    .from(schemas.dmsFile)
    .where(
      sql`${schemas.dmsFile.folderId} = (
        SELECT id FROM dms_folder WHERE path = ${folderPath}
      ) AND ${schemas.dmsFile.status} != 'trashed'`,
    );
}

async function generateZip({
  expiresIn,
  files,
  folderName,
  folderPath,
}: {
  expiresIn?: number;
  files: (typeof schemas.dmsFile.$inferSelect)[];
  folderName: string;
  folderPath: string;
}): Promise<ArchiveResult> {
  const { zip, strToU8 } = await import("fflate");
  // SAFETY: fflate's zip() matches the Node-style (data, callback) signature.
  // Promisify wraps it, so the promoted type is (data) => Promise<data>.
  const zipAsync = promisify(zip) as (data: Record<string, Uint8Array>) => Promise<Uint8Array>;

  const zipEntries: Record<string, Uint8Array> = {};
  const basePathLength = folderPath.length;

  await Promise.all(
    files.map(async (file) => {
      const data = await get({ key: file.storageKey });
      const relativePath = file.path ? file.path.slice(basePathLength + 1) : file.name;
      zipEntries[relativePath] = new Uint8Array(data);
    }),
  );

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

  const zipData = await zipAsync(zipEntries);
  const archiveKey = computeArchiveKey({ folderId: folderName });
  await upload({
    body: Buffer.from(zipData),
    contentType: "application/zip",
    key: archiveKey,
  });

  const url = await getSignedGetUrl({ expiresIn, key: archiveKey });

  return { key: archiveKey, url };
}

export class ArchiveTooLargeError extends Error {
  readonly fileCount: number;
  readonly folderId: string;
  readonly totalSize: number;

  constructor(folderId: string, fileCount: number, totalSize: number) {
    super(
      `Folder "${folderId}" is too large for synchronous archive: ` +
        `${fileCount} files, ${totalSize} bytes. Use async job instead.`,
    );
    this.name = "ArchiveTooLargeError";
    this.fileCount = fileCount;
    this.folderId = folderId;
    this.totalSize = totalSize;
  }
}
