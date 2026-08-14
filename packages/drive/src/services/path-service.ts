import { getContext } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schemas from "../db-schemas";
import { getDriveConfig } from "../runtime";
import type { BreadcrumbItem, PathResolution } from "../types";

export type DB = NodePgDatabase<Record<string, never>>;

function maxDepth(): number {
  return getDriveConfig().maxNestingDepth;
}

export async function computeFolderPath({
  name,
  parentId,
}: {
  name: string;
  parentId: string | null;
}): Promise<string> {
  if (!parentId) {
    return `/${name}`;
  }
  const parentPath = await getFolderPath({ folderId: parentId });
  return `${parentPath}/${name}`;
}

export async function computeFilePath({
  name,
  folderId,
}: {
  name: string;
  folderId: string | null;
}): Promise<string> {
  if (!folderId) {
    return `/${name}`;
  }
  const folderPath = await getFolderPath({ folderId });
  return `${folderPath}/${name}`;
}

export async function resolvePath({ path }: { path: string }): Promise<PathResolution | null> {
  const { db } = getContext();
  const normalized = normalizePath(path);

  const [folder] = await db
    .select({
      id: schemas.driveFolder.id,
      name: schemas.driveFolder.name,
      path: schemas.driveFolder.path,
    })
    .from(schemas.driveFolder)
    .where(eq(schemas.driveFolder.path, normalized))
    .limit(1);

  if (folder) {
    return { ...folder, type: "folder" as const };
  }

  const [file] = await db
    .select({
      id: schemas.driveFile.id,
      name: schemas.driveFile.name,
      path: schemas.driveFile.path,
    })
    .from(schemas.driveFile)
    .where(eq(schemas.driveFile.path, normalized))
    .limit(1);

  if (file) {
    return { ...file, type: "file" as const };
  }

  return null;
}

export async function getBreadcrumbs({
  folderId,
}: {
  folderId: string;
}): Promise<BreadcrumbItem[]> {
  const { db } = getContext();
  const [folder] = await db
    .select({
      id: schemas.driveFolder.id,
      name: schemas.driveFolder.name,
      parentId: schemas.driveFolder.parentId,
      path: schemas.driveFolder.path,
    })
    .from(schemas.driveFolder)
    .where(eq(schemas.driveFolder.id, folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${folderId}" not found.`);
  }

  const breadcrumbs: BreadcrumbItem[] = [{ id: folder.id, name: folder.name, path: folder.path }];

  // oxlint-disable eslint/no-await-in-loop
  let currentParentId = folder.parentId;
  while (currentParentId) {
    const [parent] = await db
      .select({
        id: schemas.driveFolder.id,
        name: schemas.driveFolder.name,
        parentId: schemas.driveFolder.parentId,
        path: schemas.driveFolder.path,
      })
      .from(schemas.driveFolder)
      .where(eq(schemas.driveFolder.id, currentParentId))
      .limit(1);

    if (!parent) {
      break;
    }
    breadcrumbs.unshift({
      id: parent.id,
      name: parent.name,
      path: parent.path,
    });
    currentParentId = parent.parentId;
  }
  // oxlint-enable eslint/no-await-in-loop

  return breadcrumbs;
}

export async function cascadePaths(
  { newPath, oldPath }: { oldPath: string; newPath: string },
  db: DB,
): Promise<void> {
  const prefix = `${oldPath}/%`;

  const descendantFolders = await db
    .select({ id: schemas.driveFolder.id, path: schemas.driveFolder.path })
    .from(schemas.driveFolder)
    .where(sql`${schemas.driveFolder.path} like ${prefix}`);

  await Promise.all(
    descendantFolders.map(async (folder) => {
      const updatedPath = newPath + folder.path.slice(oldPath.length);
      await db
        .update(schemas.driveFolder)
        .set({ path: updatedPath, updatedAt: new Date() })
        .where(eq(schemas.driveFolder.id, folder.id));
    }),
  );

  const descendantFiles = await db
    .select({ id: schemas.driveFile.id, path: schemas.driveFile.path })
    .from(schemas.driveFile)
    .where(sql`${schemas.driveFile.path} like ${prefix}`);

  await Promise.all(
    descendantFiles.map(async (file) => {
      const updatedPath = newPath + file.path.slice(oldPath.length);
      await db
        .update(schemas.driveFile)
        .set({ path: updatedPath, updatedAt: new Date() })
        .where(eq(schemas.driveFile.id, file.id));
    }),
  );
}

export async function wouldCreateCycle({
  folderId,
  newParentId,
}: {
  folderId: string;
  newParentId: string | null;
}): Promise<boolean> {
  const { db } = getContext();
  if (!newParentId) {
    return false;
  }
  if (folderId === newParentId) {
    return true;
  }

  let currentId: string | null = newParentId;
  let depth = 0;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    if (currentId === folderId) {
      return true;
    }
    if (depth >= maxDepth()) {
      return true;
    }

    const [parent] = await db
      .select({ parentId: schemas.driveFolder.parentId })
      .from(schemas.driveFolder)
      .where(eq(schemas.driveFolder.id, currentId))
      .limit(1);

    if (!parent) {
      break;
    }
    currentId = parent.parentId;
    depth++;
  }
  // oxlint-enable eslint/no-await-in-loop

  return false;
}

export async function getDepth({ folderId }: { folderId: string }): Promise<number> {
  const { db } = getContext();
  let depth = 0;
  let currentId: string | null = folderId;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    const [parent] = await db
      .select({ parentId: schemas.driveFolder.parentId })
      .from(schemas.driveFolder)
      .where(eq(schemas.driveFolder.id, currentId))
      .limit(1);

    if (!parent?.parentId) {
      break;
    }
    currentId = parent.parentId;
    depth++;

    if (depth > maxDepth()) {
      throw new Error(`Folder hierarchy exceeds maximum depth of ${maxDepth()}`);
    }
  }
  // oxlint-enable eslint/no-await-in-loop

  return depth;
}

export async function getSubtreeMaxDepth({ folderPath }: { folderPath: string }): Promise<number> {
  const { db } = getContext();
  const prefix = `${folderPath}/%`;
  const descendants = await db
    .select({ path: schemas.driveFolder.path })
    .from(schemas.driveFolder)
    .where(sql`${schemas.driveFolder.path} like ${prefix}`);

  const baseDepth = folderPath.split("/").length - 1;
  let maxObservedDepth = 0;

  for (const descendant of descendants) {
    const depth = descendant.path.split("/").length - 1 - baseDepth;
    if (depth > maxObservedDepth) {
      maxObservedDepth = depth;
    }
  }

  return maxObservedDepth;
}

export async function checkNameUniqueness({
  excludeId,
  name,
  parentId,
}: {
  name: string;
  parentId: string | null;
  excludeId?: string;
}): Promise<void> {
  const { db } = getContext();
  const basePath = parentId ? await getFolderPath({ folderId: parentId }) : "";
  const newPath = `${basePath}/${name}`;
  const lowerPath = newPath.toLowerCase();

  const folderConditions = [
    sql`lower(${schemas.driveFolder.path}) = ${lowerPath}`,
    eq(schemas.driveFolder.isTrashed, false),
  ];
  if (excludeId) {
    folderConditions.push(sql`${schemas.driveFolder.id} != ${excludeId}`);
  }

  const [existingFolder] = await db
    .select({ id: schemas.driveFolder.id })
    .from(schemas.driveFolder)
    .where(and(...folderConditions))
    .limit(1);

  if (existingFolder) {
    throw new Error(`An item named "${name}" already exists in this location.`);
  }

  const fileConditions = [
    sql`lower(${schemas.driveFile.path}) = ${lowerPath}`,
    eq(schemas.driveFile.isTrashed, false),
  ];

  const [existingFile] = await db
    .select({ id: schemas.driveFile.id })
    .from(schemas.driveFile)
    .where(and(...fileConditions))
    .limit(1);

  if (existingFile) {
    throw new Error(`An item named "${name}" already exists in this location.`);
  }
}

export async function getFolderPath({ folderId }: { folderId: string }): Promise<string> {
  const { db } = getContext();
  const [folder] = await db
    .select({ path: schemas.driveFolder.path })
    .from(schemas.driveFolder)
    .where(eq(schemas.driveFolder.id, folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${folderId}" not found.`);
  }

  return folder.path;
}

export async function getFilePath({ fileId }: { fileId: string }): Promise<string> {
  const { db } = getContext();
  const [file] = await db
    .select({ path: schemas.driveFile.path })
    .from(schemas.driveFile)
    .where(eq(schemas.driveFile.id, fileId))
    .limit(1);

  if (!file) {
    throw new Error(`File "${fileId}" not found.`);
  }

  return file.path;
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
}
