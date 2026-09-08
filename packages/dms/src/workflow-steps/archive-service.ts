import * as schemas from "#/db-schemas";
import { computeArchiveKey, get, getSignedGetUrl, upload } from "#/services/storage-bridge";

import { getContext } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";

const LARGE_FOLDER_FILE_THRESHOLD = 1000;
const LARGE_FOLDER_SIZE_THRESHOLD = 1024 * 1024 * 1024;
const ZIP_CONCURRENCY = 10;

export interface ArchiveResult {
  key: string;
  url: string;
}

export interface ArchiveJobData {
  folderId: string;
  includeSubfolders: boolean;
}

export interface CreateArchiveOptions {
  expiresIn?: number;
  includeSubfolders?: boolean;
  skipSizeCheck?: boolean;
}

export async function createArchive({
  folderId,
  options,
}: {
  folderId: string;
  options?: CreateArchiveOptions;
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
  if (
    !options?.skipSizeCheck &&
    (files.length > LARGE_FOLDER_FILE_THRESHOLD || totalSize > LARGE_FOLDER_SIZE_THRESHOLD)
  ) {
    throw new ArchiveTooLargeError(folderId, files.length, totalSize);
  }

  return generateZip({
    expiresIn: options?.expiresIn,
    files,
    folderId: folder.id,
    folderName: folder.name,
    folderPath: folder.path,
  });
}

export async function processArchiveJob(data: ArchiveJobData): Promise<ArchiveResult> {
  return createArchive({
    folderId: data.folderId,
    options: { includeSubfolders: data.includeSubfolders, skipSizeCheck: true },
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
      sql`${schemas.dmsFile.folder_id} = (
        SELECT id FROM dms_folder WHERE path = ${folderPath}
      ) AND ${schemas.dmsFile.status} != 'trashed'`,
    );
}

async function generateZip({
  expiresIn,
  files,
  folderId,
  folderName,
  folderPath,
}: {
  expiresIn?: number;
  files: (typeof schemas.dmsFile.$inferSelect)[];
  folderId: string;
  folderName: string;
  folderPath: string;
}): Promise<ArchiveResult> {
  const { zip, strToU8 } = await import("fflate");
  const zipAsync = (data: Record<string, Uint8Array>): Promise<Uint8Array> =>
    new Promise<Uint8Array>((resolve, reject) => {
      zip(data, (error, result) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        } else {
          resolve(result);
        }
      });
    });

  const zipEntries: Record<string, Uint8Array> = {};
  const basePathLength = folderPath.length;

  // oxlint-disable eslint/no-await-in-loop
  for (let start = 0; start < files.length; start += ZIP_CONCURRENCY) {
    const chunk = files.slice(start, start + ZIP_CONCURRENCY);
    await Promise.all(
      chunk.map(async (file) => {
        const data = await get({ key: file.storage_key });
        const relativePath = file.path ? file.path.slice(basePathLength + 1) : file.name;
        zipEntries[relativePath] = new Uint8Array(data);
      }),
    );
  }
  // oxlint-enable eslint/no-await-in-loop

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
  const archiveKey = computeArchiveKey({ folderId });
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
