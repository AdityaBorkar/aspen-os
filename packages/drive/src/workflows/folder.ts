import type { PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { driveFile, driveFolder } from "../db-schema";
import { DRIVE_EVENTS } from "../event-map";
import type { PathService } from "../services/path-service";
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

export class FolderWorkflow {
  constructor(
    private db: DB,
    private pathService: PathService,
    private pubsub: PubSubUnit,
  ) {}

  async create(input: CreateFolderInput) {
    const parsed = parse(CreateFolderSchema, input);
    const parentId = parsed.parentId ?? null;

    await this.pathService.checkNameUniqueness(parsed.name, parentId);

    if (parentId) {
      const depth = await this.pathService.getDepth(parentId);
      const maxDepth = this.pathService.maxDepth;
      if (depth >= maxDepth - 1) {
        throw new Error(
          `Maximum nesting depth of ${maxDepth} would be exceeded.`,
        );
      }
    }

    const path = await this.pathService.computeFolderPath(
      parsed.name,
      parentId,
    );

    const [folder] = await this.db
      .insert(driveFolder)
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

    await this.pubsub.publish(DRIVE_EVENTS.FOLDER_CREATED, {
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

  async rename(id: string, input: RenameFolderInput) {
    const folder = await this.getById(id);
    const parsed = parse(RenameFolderSchema, input);

    await this.pathService.checkNameUniqueness(
      parsed.name,
      folder.parentId,
      id,
    );

    const oldPath = folder.path;
    const parentPath = folder.parentId
      ? await this.pathService.getFolderPath(folder.parentId)
      : "";
    const newPath = `${parentPath}/${parsed.name}`;

    const [updated] = await this.db
      .update(driveFolder)
      .set({ name: parsed.name, path: newPath, updatedAt: new Date() })
      .where(eq(driveFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await this.pathService.cascadePaths(oldPath, newPath);

    await this.pubsub.publish(DRIVE_EVENTS.FOLDER_RENAMED, {
      folder: {
        id: updated.id,
        name: updated.name,
        path: updated.path,
      },
      oldName: folder.name,
    });

    return updated;
  }

  async move(id: string, input: MoveFolderInput) {
    const folder = await this.getById(id);
    const parsed = parse(MoveFolderSchema, input);
    const newParentId = parsed.newParentId ?? null;

    if (await this.pathService.wouldCreateCycle(id, newParentId)) {
      throw new Error("Cannot move a folder into itself or its descendants.");
    }

    await this.pathService.checkNameUniqueness(folder.name, newParentId, id);

    if (newParentId) {
      const parentDepth = await this.pathService.getDepth(newParentId);
      const subtreeDepth = await this.pathService.getSubtreeMaxDepth(
        folder.path,
      );
      const maxDepth = this.pathService.maxDepth;
      if (parentDepth + 1 + subtreeDepth >= maxDepth) {
        throw new Error(
          `Maximum nesting depth of ${maxDepth} would be exceeded.`,
        );
      }
    }

    const oldPath = folder.path;
    const parentPath = newParentId
      ? await this.pathService.getFolderPath(newParentId)
      : "";
    const newPath = `${parentPath}/${folder.name}`;

    const [updated] = await this.db
      .update(driveFolder)
      .set({
        parentId: newParentId,
        path: newPath,
        updatedAt: new Date(),
      })
      .where(eq(driveFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await this.pathService.cascadePaths(oldPath, newPath);

    await this.pubsub.publish(DRIVE_EVENTS.MOVED, {
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

  async update(id: string, input: UpdateFolderInput) {
    await this.getById(id);
    const parsed = parse(UpdateFolderSchema, input);

    const [updated] = await this.db
      .update(driveFolder)
      .set({
        color: parsed.color,
        description: parsed.description,
        updatedAt: new Date(),
      })
      .where(eq(driveFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    return updated;
  }

  async delete(id: string, force = false) {
    await this.getById(id);

    const [childFolder] = await this.db
      .select({ id: driveFolder.id })
      .from(driveFolder)
      .where(
        and(eq(driveFolder.parentId, id), eq(driveFolder.isTrashed, false)),
      )
      .limit(1);

    const [childFile] = await this.db
      .select({ id: driveFile.id })
      .from(driveFile)
      .where(and(eq(driveFile.folderId, id), eq(driveFile.isTrashed, false)))
      .limit(1);

    if ((childFolder || childFile) && !force) {
      throw new Error(
        "Cannot delete a non-empty folder. Use force=true or empty the folder first.",
      );
    }

    const [updated] = await this.db
      .update(driveFolder)
      .set({
        isTrashed: true,
        trashedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(driveFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await this.pubsub.publish(DRIVE_EVENTS.TRASHED, {
      itemId: id,
      itemType: "folder",
    });

    return updated;
  }

  async restore(id: string) {
    const folder = await this.getById(id);

    if (folder.parentId) {
      const [parent] = await this.db
        .select({ id: driveFolder.id, isTrashed: driveFolder.isTrashed })
        .from(driveFolder)
        .where(eq(driveFolder.id, folder.parentId))
        .limit(1);

      if (!parent || parent.isTrashed) {
        await this.db
          .update(driveFolder)
          .set({ parentId: null, updatedAt: new Date() })
          .where(eq(driveFolder.id, id));
      }
    }

    const [updated] = await this.db
      .update(driveFolder)
      .set({
        isTrashed: false,
        trashedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(driveFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await this.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "folder",
    });

    return updated;
  }

  async getById(id: string) {
    const [folder] = await this.db
      .select()
      .from(driveFolder)
      .where(eq(driveFolder.id, id))
      .limit(1);

    if (!folder) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    return folder;
  }

  async get(id: string): Promise<FolderWithMetadata> {
    const folder = await this.getById(id);

    const [childCountRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(driveFolder)
      .where(
        and(eq(driveFolder.parentId, id), eq(driveFolder.isTrashed, false)),
      );

    const [fileCountRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(driveFile)
      .where(and(eq(driveFile.folderId, id), eq(driveFile.isTrashed, false)));

    const [sizeRow] = await this.db
      .select({
        totalSize: sql<number>`coalesce(sum(${driveFile.size}), 0)`,
      })
      .from(driveFile)
      .where(
        and(
          sql`${driveFile.path} like ${`${folder.path}/%`}`,
          eq(driveFile.isTrashed, false),
        ),
      );

    return {
      ...folder,
      childCount: (childCountRow?.count ?? 0) + (fileCountRow?.count ?? 0),
      totalSize: sizeRow?.totalSize ?? 0,
    };
  }

  async list(id?: string | null, opts?: ListFolderOptions) {
    const parsed = parse(ListFolderOptionsSchema, opts ?? {});
    const limit = parsed.limit ?? 50;
    const offset = parsed.offset ?? 0;
    const sortBy = parsed.sortBy ?? "name";
    const sortOrder = parsed.sortOrder ?? "asc";

    const folderConditions = [
      eq(driveFolder.isTrashed, false),
      id ? eq(driveFolder.parentId, id) : sql`${driveFolder.parentId} IS NULL`,
    ];

    if (parsed.search) {
      folderConditions.push(
        sql`${driveFolder.name} ilike ${`%${parsed.search}%`}`,
      );
    }

    const folders = await this.db
      .select()
      .from(driveFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);

    const fileConditions = [
      eq(driveFile.isTrashed, false),
      id ? eq(driveFile.folderId, id) : sql`${driveFile.folderId} IS NULL`,
    ];

    if (parsed.search) {
      fileConditions.push(sql`${driveFile.name} ilike ${`%${parsed.search}%`}`);
    }

    const files = await this.db
      .select()
      .from(driveFile)
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
}
