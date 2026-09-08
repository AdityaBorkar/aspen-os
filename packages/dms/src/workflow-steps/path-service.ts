import * as schemas from "#/db-schemas";
import { getDmsConfig } from "#/runtime";
import type { BreadcrumbItem, PathResolution } from "#/types";
import { escapeLike } from "#/utils/escape-like";

import { getContext } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type DB = PostgresJsDatabase;

interface AncestorRow {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
}

export function joinPath(...parts: string[]): string {
  const collapsed = parts.join("/").replaceAll(/\/{2,}/g, "/");
  const trimmed = collapsed.length > 1 ? collapsed.replace(/\/+$/g, "") : collapsed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function getAncestors(
  db: DB,
  folderId: string,
  maxEntries = Number.POSITIVE_INFINITY,
): Promise<AncestorRow[]> {
  const chain: AncestorRow[] = [];
  const visited = new Set<string>();
  let currentId: string | null = folderId;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);
    if (chain.length >= maxEntries) {
      break;
    }

    const [row] = await db
      .select({
        id: schemas.dmsFolder.id,
        name: schemas.dmsFolder.name,
        parentId: schemas.dmsFolder.parent_id,
        path: schemas.dmsFolder.path,
      })
      .from(schemas.dmsFolder)
      .where(eq(schemas.dmsFolder.id, currentId))
      .limit(1);

    if (!row) {
      break;
    }
    chain.push(row);
    currentId = row.parentId;
  }
  // oxlint-enable eslint/no-await-in-loop

  return chain;
}

export async function computeFolderPath({
  name,
  parentId,
}: {
  name: string;
  parentId: string | null;
}): Promise<string> {
  if (!parentId) {
    return joinPath("/", name);
  }
  const parentPath = await getFolderPath({ folderId: parentId });
  return joinPath(parentPath, name);
}

export async function computeFilePath({
  name,
  folderId,
}: {
  name: string;
  folderId: string | null;
}): Promise<string | null> {
  if (!folderId) {
    return null;
  }
  const folderPath = await getFolderPath({ folderId });
  return joinPath(folderPath, name);
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
  const chain = await getAncestors(db, folderId);

  if (chain.length === 0) {
    throw new Error(`Folder "${folderId}" not found.`);
  }

  return chain
    .toReversed()
    .map((folder) => ({ id: folder.id, name: folder.name, path: folder.path }));
}

export async function cascadePaths(
  { newPath, oldPath }: { oldPath: string; newPath: string },
  db: DB,
): Promise<void> {
  const now = new Date();
  const prefix = `${escapeLike(oldPath)}/%`;

  const descendantFolders = await db
    .select({ id: schemas.dmsFolder.id, path: schemas.dmsFolder.path })
    .from(schemas.dmsFolder)
    .where(sql`${schemas.dmsFolder.path} like ${prefix} escape '\'`);

  await Promise.all(
    descendantFolders.map(async (folder) => {
      const updatedPath = newPath + folder.path.slice(oldPath.length);
      await db
        .update(schemas.dmsFolder)
        .set({ path: updatedPath, updated_at: now })
        .where(eq(schemas.dmsFolder.id, folder.id));
    }),
  );

  const descendantFiles = await db
    .select({ id: schemas.dmsFile.id, path: schemas.dmsFile.path })
    .from(schemas.dmsFile)
    .where(sql`${schemas.dmsFile.path} like ${prefix} escape '\'`);

  await Promise.all(
    descendantFiles.map(async (file) => {
      if (!file.path) {
        return;
      }
      const updatedPath = newPath + file.path.slice(oldPath.length);
      await db
        .update(schemas.dmsFile)
        .set({ path: updatedPath, updated_at: now })
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

  const limit = getDmsConfig().maxNestingDepth;
  const chain = await getAncestors(db, newParentId, limit + 1);
  return chain.some((ancestor) => ancestor.id === folderId) || chain.length > limit;
}

export async function getDepth({ folderId }: { folderId: string }): Promise<number> {
  const { db } = getContext();
  const limit = getDmsConfig().maxNestingDepth;
  const chain = await getAncestors(db, folderId, limit + 2);
  const depth = Math.max(chain.length - 1, 0);

  if (depth > limit) {
    throw new Error(`Folder hierarchy exceeds maximum depth of ${limit}`);
  }

  return depth;
}

export async function getSubtreeMaxDepth({ folderPath }: { folderPath: string }): Promise<number> {
  const { db } = getContext();
  const prefix = `${escapeLike(folderPath)}/%`;
  const descendants = await db
    .select({ path: schemas.dmsFolder.path })
    .from(schemas.dmsFolder)
    .where(sql`${schemas.dmsFolder.path} like ${prefix} escape '\'`);

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
    eq(schemas.dmsFolder.is_trashed, false),
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
    sql`${schemas.dmsFile.status} != 'trashed'`,
  ];
  if (excludeId) {
    fileConditions.push(sql`${schemas.dmsFile.id} != ${excludeId}`);
  }

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

export async function getFilePath({ fileId }: { fileId: string }): Promise<string | null> {
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
