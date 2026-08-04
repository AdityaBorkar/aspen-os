import type { PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import {
  cascadePaths,
  checkNameUniqueness,
  computeFolderPath,
  getDepth,
  getFolderPath,
  getSubtreeMaxDepth,
  type PathServiceDeps,
  wouldCreateCycle,
} from "../services/path-service";
import type {
  CreateFolderInput,
  FolderWithMetadata,
  ListFolderOptions,
  MoveFolderInput,
  RenameFolderInput,
  UpdateFolderInput,
} from "../types";
import {
  CreateFolderSchema,
  ListFolderOptionsSchema,
  MoveFolderSchema,
  RenameFolderSchema,
  UpdateFolderSchema,
} from "../types";

type DB = NodePgDatabase<Record<string, never>>;

export interface FolderDeps {
  db: DB;
  pathDeps: PathServiceDeps;
  pubsub: PubSubUnit;
}

export async function createFolder(
  input: CreateFolderInput,
  { db, pathDeps, pubsub }: FolderDeps,
) {
  const parsed = parse(CreateFolderSchema, input);
  const parentId = parsed.parentId ?? null;

  await checkNameUniqueness({ name: parsed.name, parentId }, pathDeps);

  if (parentId) {
    const depth = await getDepth({ folderId: parentId }, pathDeps);
    const maxDepth = pathDeps.maxDepth;
    if (depth >= maxDepth - 1) {
      throw new Error(
        `Maximum nesting depth of ${maxDepth} would be exceeded.`,
      );
    }
  }

  const path = await computeFolderPath(
    { name: parsed.name, parentId },
    pathDeps,
  );

  const [folder] = await db
    .insert(s.driveFolder)
    .values({
      color: parsed.color ?? null,
      description: parsed.description ?? null,
      name: parsed.name,
      ownerId: parsed.ownerId,
      parentId,
      path,
    })
    .returning();

  if (!folder) {
    throw new Error("Failed to create folder.");
  }

  await pubsub.publish(DRIVE_EVENTS.FOLDER_CREATED, {
    folder: {
      id: folder.id,
      name: folder.name,
      ownerId: folder.ownerId,
      parentId: folder.parentId,
      path: folder.path,
    },
  });

  return folder;
}

export async function renameFolder(
  { id, input }: { id: string; input: RenameFolderInput },
  { db, pathDeps, pubsub }: FolderDeps,
) {
  const folder = await getFolderById({ id }, { db });
  const parsed = parse(RenameFolderSchema, input);

  await checkNameUniqueness(
    { excludeId: id, name: parsed.name, parentId: folder.parentId },
    pathDeps,
  );

  const oldPath = folder.path;
  const parentPath = folder.parentId
    ? await getFolderPath({ folderId: folder.parentId }, pathDeps)
    : "";
  const newPath = `${parentPath}/${parsed.name}`;

  const [updated] = await db
    .update(s.driveFolder)
    .set({ name: parsed.name, path: newPath, updatedAt: new Date() })
    .where(eq(s.driveFolder.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  await cascadePaths({ newPath, oldPath }, pathDeps);

  await pubsub.publish(DRIVE_EVENTS.FOLDER_RENAMED, {
    folder: {
      id: updated.id,
      name: updated.name,
      path: updated.path,
    },
    oldName: folder.name,
  });

  return updated;
}

export async function moveFolder(
  { id, input }: { id: string; input: MoveFolderInput },
  { db, pathDeps, pubsub }: FolderDeps,
) {
  const folder = await getFolderById({ id }, { db });
  const parsed = parse(MoveFolderSchema, input);
  const newParentId = parsed.newParentId ?? null;

  if (await wouldCreateCycle({ folderId: id, newParentId }, pathDeps)) {
    throw new Error("Cannot move a folder into itself or its descendants.");
  }

  await checkNameUniqueness(
    { excludeId: id, name: folder.name, parentId: newParentId },
    pathDeps,
  );

  if (newParentId) {
    const parentDepth = await getDepth({ folderId: newParentId }, pathDeps);
    const subtreeDepth = await getSubtreeMaxDepth(
      { folderPath: folder.path },
      pathDeps,
    );
    const maxDepth = pathDeps.maxDepth;
    if (parentDepth + 1 + subtreeDepth >= maxDepth) {
      throw new Error(
        `Maximum nesting depth of ${maxDepth} would be exceeded.`,
      );
    }
  }

  const oldPath = folder.path;
  const parentPath = newParentId
    ? await getFolderPath({ folderId: newParentId }, pathDeps)
    : "";
  const newPath = `${parentPath}/${folder.name}`;

  const [updated] = await db
    .update(s.driveFolder)
    .set({
      parentId: newParentId,
      path: newPath,
      updatedAt: new Date(),
    })
    .where(eq(s.driveFolder.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  await cascadePaths({ newPath, oldPath }, pathDeps);

  await pubsub.publish(DRIVE_EVENTS.MOVED, {
    item: {
      id: updated.id,
      name: updated.name,
      path: updated.path,
    },
    itemType: "folder",
    newPath,
    oldPath,
  });

  return updated;
}

export async function updateFolder(
  { id, input }: { id: string; input: UpdateFolderInput },
  { db }: FolderDeps,
) {
  await getFolderById({ id }, { db });
  const parsed = parse(UpdateFolderSchema, input);

  const [updated] = await db
    .update(s.driveFolder)
    .set({
      color: parsed.color,
      description: parsed.description,
      updatedAt: new Date(),
    })
    .where(eq(s.driveFolder.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  return updated;
}

export async function deleteFolder(
  { id, force = false }: { id: string; force?: boolean },
  { db, pubsub }: FolderDeps,
) {
  await getFolderById({ id }, { db });

  const [childFolder] = await db
    .select({ id: s.driveFolder.id })
    .from(s.driveFolder)
    .where(
      and(eq(s.driveFolder.parentId, id), eq(s.driveFolder.isTrashed, false)),
    )
    .limit(1);

  const [childFile] = await db
    .select({ id: s.driveFile.id })
    .from(s.driveFile)
    .where(and(eq(s.driveFile.folderId, id), eq(s.driveFile.isTrashed, false)))
    .limit(1);

  if ((childFolder || childFile) && !force) {
    throw new Error(
      "Cannot delete a non-empty folder. Use force=true or empty the folder first.",
    );
  }

  const [updated] = await db
    .update(s.driveFolder)
    .set({
      isTrashed: true,
      trashedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(s.driveFolder.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  await pubsub.publish(DRIVE_EVENTS.TRASHED, {
    itemId: id,
    itemType: "folder",
  });

  return updated;
}

export async function restoreFolder(
  { id }: { id: string },
  { db, pubsub }: FolderDeps,
) {
  const folder = await getFolderById({ id }, { db });

  if (folder.parentId) {
    const [parent] = await db
      .select({ id: s.driveFolder.id, isTrashed: s.driveFolder.isTrashed })
      .from(s.driveFolder)
      .where(eq(s.driveFolder.id, folder.parentId))
      .limit(1);

    if (!parent || parent.isTrashed) {
      await db
        .update(s.driveFolder)
        .set({ parentId: null, updatedAt: new Date() })
        .where(eq(s.driveFolder.id, id));
    }
  }

  const [updated] = await db
    .update(s.driveFolder)
    .set({
      isTrashed: false,
      trashedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(s.driveFolder.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  await pubsub.publish(DRIVE_EVENTS.RESTORED, {
    itemId: id,
    itemType: "folder",
  });

  return updated;
}

export async function getFolderById(
  { id }: { id: string },
  { db }: { db: DB },
) {
  const [folder] = await db
    .select()
    .from(s.driveFolder)
    .where(eq(s.driveFolder.id, id))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  return folder;
}

export async function getFolder(
  { id }: { id: string },
  { db }: FolderDeps,
): Promise<FolderWithMetadata> {
  const folder = await getFolderById({ id }, { db });

  const [childCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(s.driveFolder)
    .where(
      and(eq(s.driveFolder.parentId, id), eq(s.driveFolder.isTrashed, false)),
    );

  const [fileCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(s.driveFile)
    .where(and(eq(s.driveFile.folderId, id), eq(s.driveFile.isTrashed, false)));

  const [sizeRow] = await db
    .select({
      totalSize: sql<number>`coalesce(sum(${s.driveFile.size}), 0)`,
    })
    .from(s.driveFile)
    .where(
      and(
        sql`${s.driveFile.path} like ${`${folder.path}/%`}`,
        eq(s.driveFile.isTrashed, false),
      ),
    );

  return {
    ...folder,
    childCount: (childCountRow?.count ?? 0) + (fileCountRow?.count ?? 0),
    totalSize: sizeRow?.totalSize ?? 0,
  };
}

export async function listFolders(
  { id, opts }: { id?: string | null; opts?: ListFolderOptions },
  { db }: FolderDeps,
) {
  const parsed = parse(ListFolderOptionsSchema, opts ?? {});
  const limit = parsed.limit ?? 50;
  const offset = parsed.offset ?? 0;
  const sortBy = parsed.sortBy ?? "name";
  const sortOrder = parsed.sortOrder ?? "asc";

  const folderConditions = [
    eq(s.driveFolder.isTrashed, false),
    id
      ? eq(s.driveFolder.parentId, id)
      : sql`${s.driveFolder.parentId} IS NULL`,
  ];

  if (parsed.search) {
    folderConditions.push(
      sql`${s.driveFolder.name} ilike ${`%${parsed.search}%`}`,
    );
  }

  const folders = await db
    .select()
    .from(s.driveFolder)
    .where(and(...folderConditions))
    .limit(limit)
    .offset(offset);

  const fileConditions = [
    eq(s.driveFile.isTrashed, false),
    id ? eq(s.driveFile.folderId, id) : sql`${s.driveFile.folderId} IS NULL`,
  ];

  if (parsed.search) {
    fileConditions.push(sql`${s.driveFile.name} ilike ${`%${parsed.search}%`}`);
  }

  const files = await db
    .select()
    .from(s.driveFile)
    .where(and(...fileConditions))
    .limit(limit)
    .offset(offset);

  const sortFn = (a: { name: string }, b: { name: string }) => {
    const cmp = a.name.localeCompare(b.name);
    return sortOrder === "desc" ? -cmp : cmp;
  };

  return {
    files: files.sort(sortFn),
    folders: folders.sort(sortFn),
    sortBy,
    sortOrder,
  };
}
