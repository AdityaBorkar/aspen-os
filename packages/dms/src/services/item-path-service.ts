import { getContext } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schemas from "../db-schemas";
import { getDmsConfig } from "../runtime";
import type { BreadcrumbItem, PathResolution } from "../types";

export type DB = NodePgDatabase<Record<string, never>>;

function maxDepth(): number {
  return getDmsConfig().maxNestingDepth;
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
      id: schemas.dmsFolder.id,
      name: schemas.dmsFolder.name,
      path: schemas.dmsFolder.path,
    })
    .from(schemas.dmsFolder)
    .where(eq(schemas.dmsFolder.path, normalized))
    .limit(1);

  if (folder) {
    return { ...folder, type: "folder" as const };
  }

  const [file] = await db
    .select({
      id: schemas.dmsFile.id,
      name: schemas.dmsFile.name,
      path: schemas.dmsFile.path,
    })
    .from(schemas.dmsFile)
    .where(eq(schemas.dmsFile.path, normalized))
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
      id: schemas.dmsFolder.id,
      name: schemas.dmsFolder.name,
      parentId: schemas.dmsFolder.parentId,
      path: schemas.dmsFolder.path,
    })
    .from(schemas.dmsFolder)
    .where(eq(schemas.dmsFolder.id, folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${folderId}" not found.`);
  }

  const breadcrumbs: BreadcrumbItem[] = [{ id: folder.id, name: folder.name, path: folder.path }];

  let currentParentId = folder.parentId;
  // oxlint-disable eslint/no-await-in-loop
  while (currentParentId) {
    const [parent] = await db
      .select({
        id: schemas.dmsFolder.id,
        name: schemas.dmsFolder.name,
        parentId: schemas.dmsFolder.parentId,
        path: schemas.dmsFolder.path,
      })
      .from(schemas.dmsFolder)
      .where(eq(schemas.dmsFolder.id, currentParentId))
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
    .select({ id: schemas.dmsFolder.id, path: schemas.dmsFolder.path })
    .from(schemas.dmsFolder)
    .where(sql`${schemas.dmsFolder.path} like ${prefix}`);

  await Promise.all(
    descendantFolders.map(async (folder) => {
      const updatedPath = newPath + folder.path.slice(oldPath.length);
      await db
        .update(schemas.dmsFolder)
        .set({ path: updatedPath, updatedAt: new Date() })
        .where(eq(schemas.dmsFolder.id, folder.id));
    }),
  );

  const descendantFiles = await db
    .select({ id: schemas.dmsFile.id, path: schemas.dmsFile.path })
    .from(schemas.dmsFile)
    .where(sql`${schemas.dmsFile.path} like ${prefix}`);

  await Promise.all(
    descendantFiles.map(async (file) => {
      const updatedPath = newPath + file.path.slice(oldPath.length);
      await db
        .update(schemas.dmsFile)
        .set({ path: updatedPath, updatedAt: new Date() })
        .where(eq(schemas.dmsFile.id, file.id));
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
      .select({ parentId: schemas.dmsFolder.parentId })
      .from(schemas.dmsFolder)
      .where(eq(schemas.dmsFolder.id, currentId))
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
      .select({ parentId: schemas.dmsFolder.parentId })
      .from(schemas.dmsFolder)
      .where(eq(schemas.dmsFolder.id, currentId))
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
    .select({ path: schemas.dmsFolder.path })
    .from(schemas.dmsFolder)
    .where(sql`${schemas.dmsFolder.path} like ${prefix}`);

  const baseDepth = folderPath.split("/").length - 1;
  let maxDepthValue = 0;

  for (const descendant of descendants) {
    const depth = descendant.path.split("/").length - 1 - baseDepth;
    if (depth > maxDepthValue) {
      maxDepthValue = depth;
    }
  }

  return maxDepthValue;
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
    sql`lower(${schemas.dmsFolder.path}) = ${lowerPath}`,
    eq(schemas.dmsFolder.isTrashed, false),
  ];
  if (excludeId) {
    folderConditions.push(sql`${schemas.dmsFolder.id} != ${excludeId}`);
  }

  const [existingFolder] = await db
    .select({ id: schemas.dmsFolder.id })
    .from(schemas.dmsFolder)
    .where(and(...folderConditions))
    .limit(1);

  if (existingFolder) {
    throw new Error(`An item named "${name}" already exists in this location.`);
  }

  const fileConditions = [
    sql`lower(${schemas.dmsFile.path}) = ${lowerPath}`,
    eq(schemas.dmsFile.isTrashed, false),
  ];

  const [existingFile] = await db
    .select({ id: schemas.dmsFile.id })
    .from(schemas.dmsFile)
    .where(and(...fileConditions))
    .limit(1);

  if (existingFile) {
    throw new Error(`An item named "${name}" already exists in this location.`);
  }
}

export async function getFolderPath({ folderId }: { folderId: string }): Promise<string> {
  const { db } = getContext();
  const [folder] = await db
    .select({ path: schemas.dmsFolder.path })
    .from(schemas.dmsFolder)
    .where(eq(schemas.dmsFolder.id, folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${folderId}" not found.`);
  }

  return folder.path;
}

export async function getFilePath({ fileId }: { fileId: string }): Promise<string> {
  const { db } = getContext();
  const [file] = await db
    .select({ path: schemas.dmsFile.path })
    .from(schemas.dmsFile)
    .where(eq(schemas.dmsFile.id, fileId))
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
