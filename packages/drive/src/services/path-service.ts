import { getContext } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as s from "../db-schema";
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
  if (!parentId) return `/${name}`;
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
  if (!folderId) return `/${name}`;
  const folderPath = await getFolderPath({ folderId });
  return `${folderPath}/${name}`;
}

export async function resolvePath({
  path,
}: {
  path: string;
}): Promise<PathResolution | null> {
  const { db } = getContext();
  const normalized = normalizePath(path);

  const [folder] = await db
    .select({
      id: s.driveFolder.id,
      name: s.driveFolder.name,
      path: s.driveFolder.path,
    })
    .from(s.driveFolder)
    .where(eq(s.driveFolder.path, normalized))
    .limit(1);

  if (folder) {
    return { ...folder, type: "folder" as const };
  }

  const [file] = await db
    .select({
      id: s.driveFile.id,
      name: s.driveFile.name,
      path: s.driveFile.path,
    })
    .from(s.driveFile)
    .where(eq(s.driveFile.path, normalized))
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
      id: s.driveFolder.id,
      name: s.driveFolder.name,
      parentId: s.driveFolder.parentId,
      path: s.driveFolder.path,
    })
    .from(s.driveFolder)
    .where(eq(s.driveFolder.id, folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${folderId}" not found.`);
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { id: folder.id, name: folder.name, path: folder.path },
  ];

  let currentParentId = folder.parentId;
  while (currentParentId) {
    const [parent] = await db
      .select({
        id: s.driveFolder.id,
        name: s.driveFolder.name,
        parentId: s.driveFolder.parentId,
        path: s.driveFolder.path,
      })
      .from(s.driveFolder)
      .where(eq(s.driveFolder.id, currentParentId))
      .limit(1);

    if (!parent) break;
    breadcrumbs.unshift({
      id: parent.id,
      name: parent.name,
      path: parent.path,
    });
    currentParentId = parent.parentId;
  }

  return breadcrumbs;
}

export async function cascadePaths(
  { newPath, oldPath }: { oldPath: string; newPath: string },
  db: DB,
): Promise<void> {
  const prefix = `${oldPath}/%`;

  const descendantFolders = await db
    .select({ id: s.driveFolder.id, path: s.driveFolder.path })
    .from(s.driveFolder)
    .where(sql`${s.driveFolder.path} like ${prefix}`);

  for (const f of descendantFolders) {
    const updatedPath = newPath + f.path.slice(oldPath.length);
    await db
      .update(s.driveFolder)
      .set({ path: updatedPath, updatedAt: new Date() })
      .where(eq(s.driveFolder.id, f.id));
  }

  const descendantFiles = await db
    .select({ id: s.driveFile.id, path: s.driveFile.path })
    .from(s.driveFile)
    .where(sql`${s.driveFile.path} like ${prefix}`);

  for (const file of descendantFiles) {
    const updatedPath = newPath + file.path.slice(oldPath.length);
    await db
      .update(s.driveFile)
      .set({ path: updatedPath, updatedAt: new Date() })
      .where(eq(s.driveFile.id, file.id));
  }
}

export async function wouldCreateCycle({
  folderId,
  newParentId,
}: {
  folderId: string;
  newParentId: string | null;
}): Promise<boolean> {
  const { db } = getContext();
  if (!newParentId) return false;
  if (folderId === newParentId) return true;

  let currentId: string | null = newParentId;
  let depth = 0;

  while (currentId !== null) {
    if (currentId === folderId) return true;
    if (depth >= maxDepth()) return true;

    const [parent] = await db
      .select({ parentId: s.driveFolder.parentId })
      .from(s.driveFolder)
      .where(eq(s.driveFolder.id, currentId))
      .limit(1);

    if (!parent) break;
    currentId = parent.parentId;
    depth++;
  }

  return false;
}

export async function getDepth({
  folderId,
}: {
  folderId: string;
}): Promise<number> {
  const { db } = getContext();
  let depth = 0;
  let currentId: string | null = folderId;

  while (currentId !== null) {
    const [parent] = await db
      .select({ parentId: s.driveFolder.parentId })
      .from(s.driveFolder)
      .where(eq(s.driveFolder.id, currentId))
      .limit(1);

    if (!parent?.parentId) break;
    currentId = parent.parentId;
    depth++;

    if (depth > maxDepth()) {
      throw new Error(
        `Folder hierarchy exceeds maximum depth of ${maxDepth()}`,
      );
    }
  }

  return depth;
}

export async function getSubtreeMaxDepth({
  folderPath,
}: {
  folderPath: string;
}): Promise<number> {
  const { db } = getContext();
  const prefix = `${folderPath}/%`;
  const descendants = await db
    .select({ path: s.driveFolder.path })
    .from(s.driveFolder)
    .where(sql`${s.driveFolder.path} like ${prefix}`);

  const baseDepth = folderPath.split("/").length - 1;
  let maxDepth = 0;

  for (const d of descendants) {
    const depth = d.path.split("/").length - 1 - baseDepth;
    if (depth > maxDepth) maxDepth = depth;
  }

  return maxDepth;
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
    sql`lower(${s.driveFolder.path}) = ${lowerPath}`,
    eq(s.driveFolder.isTrashed, false),
  ];
  if (excludeId) {
    folderConditions.push(sql`${s.driveFolder.id} != ${excludeId}`);
  }

  const [existingFolder] = await db
    .select({ id: s.driveFolder.id })
    .from(s.driveFolder)
    .where(and(...folderConditions))
    .limit(1);

  if (existingFolder) {
    throw new Error(`An item named "${name}" already exists in this location.`);
  }

  const fileConditions = [
    sql`lower(${s.driveFile.path}) = ${lowerPath}`,
    eq(s.driveFile.isTrashed, false),
  ];

  const [existingFile] = await db
    .select({ id: s.driveFile.id })
    .from(s.driveFile)
    .where(and(...fileConditions))
    .limit(1);

  if (existingFile) {
    throw new Error(`An item named "${name}" already exists in this location.`);
  }
}

export async function getFolderPath({
  folderId,
}: {
  folderId: string;
}): Promise<string> {
  const { db } = getContext();
  const [folder] = await db
    .select({ path: s.driveFolder.path })
    .from(s.driveFolder)
    .where(eq(s.driveFolder.id, folderId))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder "${folderId}" not found.`);
  }

  return folder.path;
}

export async function getFilePath({
  fileId,
}: {
  fileId: string;
}): Promise<string> {
  const { db } = getContext();
  const [file] = await db
    .select({ path: s.driveFile.path })
    .from(s.driveFile)
    .where(eq(s.driveFile.id, fileId))
    .limit(1);

  if (!file) {
    throw new Error(`File "${fileId}" not found.`);
  }

  return file.path;
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}
