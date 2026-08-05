import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { boolean, object, optional, parse, string } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import { getDriveConfig } from "../runtime";
import {
  cascadePaths,
  checkNameUniqueness,
  computeFolderPath,
  getDepth,
  getFolderPath,
  getSubtreeMaxDepth,
  wouldCreateCycle,
} from "../services/path-service";
import type { ListFolderOptions } from "../types";
import {
  CreateFolderSchema,
  ListFolderOptionsSchema,
  MoveFolderSchema,
  RenameFolderSchema,
  UpdateFolderSchema,
} from "../types";

const CreateInputSchema = object({ input: CreateFolderSchema });
const WithIdSchema = object({ id: string() });
const RenameInputSchema = object({ id: string(), input: RenameFolderSchema });
const MoveInputSchema = object({ id: string(), input: MoveFolderSchema });
const UpdateInputSchema = object({ id: string(), input: UpdateFolderSchema });
const DeleteInputSchema = object({ force: optional(boolean()), id: string() });

export const createFolder = Workflow.name("drive.folder.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFolderSchema, input);
    const parentId = parsed.parentId ?? null;

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({ name: parsed.name, parentId });
    });

    if (parentId) {
      await ctx.step.run("check-depth", async () => {
        const depth = await getDepth({ folderId: parentId });
        const md = getDriveConfig().maxNestingDepth;
        if (depth >= md - 1) {
          throw new Error(`Maximum nesting depth of ${md} would be exceeded.`);
        }
        return depth;
      });
    }

    const path = await ctx.step.run("compute-path", async () =>
      computeFolderPath({ name: parsed.name, parentId }),
    );

    const [folder] = await ctx.db
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

    if (!folder) throw new Error("Failed to create folder.");

    await ctx.pubsub.publish(DRIVE_EVENTS.FOLDER_CREATED, {
      folder: {
        id: folder.id,
        name: folder.name,
        ownerId: folder.ownerId,
        parentId: folder.parentId,
        path: folder.path,
      },
    });

    return folder;
  });

export const getFolderById = Workflow.name("drive.folder.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [folder] = await ctx.db
      .select()
      .from(s.driveFolder)
      .where(eq(s.driveFolder.id, id))
      .limit(1);
    if (!folder) throw new Error(`Folder with id "${id}" not found.`);
    return folder;
  });

export const renameFolder = Workflow.name("drive.folder.rename")
  .input(RenameInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const fetched = await ctx.step.run("fetch-folder", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, id))
        .limit(1);
      if (!row) throw new Error(`Folder with id "${id}" not found.`);
      return row;
    });
    const parsed = parse(RenameFolderSchema, input);

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({
        excludeId: id,
        name: parsed.name,
        parentId: fetched.parentId,
      });
    });

    const oldPath = fetched.path;
    const parentPath = fetched.parentId
      ? await ctx.step.run("get-parent-path", async () =>
          getFolderPath({ folderId: fetched.parentId as string }),
        )
      : "";
    const newPath = `${parentPath}/${parsed.name}`;

    const [updated] = await ctx.db
      .update(s.driveFolder)
      .set({ name: parsed.name, path: newPath, updatedAt: new Date() })
      .where(eq(s.driveFolder.id, id))
      .returning();

    if (!updated) throw new Error(`Folder with id "${id}" not found.`);

    await ctx.step.run("cascade-paths", async () => {
      await cascadePaths({ newPath, oldPath }, ctx.db);
    });

    await ctx.pubsub.publish(DRIVE_EVENTS.FOLDER_RENAMED, {
      folder: { id: updated.id, name: updated.name, path: updated.path },
      oldName: fetched.name,
    });

    return updated;
  });

export const moveFolder = Workflow.name("drive.folder.move")
  .input(MoveInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const fetched = await ctx.step.run("fetch-folder", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, id))
        .limit(1);
      if (!row) throw new Error(`Folder with id "${id}" not found.`);
      return row;
    });
    const parsed = parse(MoveFolderSchema, input);
    const newParentId = parsed.newParentId ?? null;

    if (
      await ctx.step.run("check-cycle", async () =>
        wouldCreateCycle({ folderId: id, newParentId }),
      )
    ) {
      throw new Error("Cannot move a folder into itself or its descendants.");
    }

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({
        excludeId: id,
        name: fetched.name,
        parentId: newParentId,
      });
    });

    if (newParentId) {
      const parentDepth = await ctx.step.run("get-parent-depth", async () =>
        getDepth({ folderId: newParentId }),
      );
      const subtreeDepth = await ctx.step.run("get-subtree-depth", async () =>
        getSubtreeMaxDepth({ folderPath: fetched.path }),
      );
      const md = getDriveConfig().maxNestingDepth;
      if (parentDepth + 1 + subtreeDepth >= md) {
        throw new Error(`Maximum nesting depth of ${md} would be exceeded.`);
      }
    }

    const oldPath = fetched.path;
    const parentPath = newParentId
      ? await ctx.step.run("get-parent-path", async () =>
          getFolderPath({ folderId: newParentId }),
        )
      : "";
    const newPath = `${parentPath}/${fetched.name}`;

    const [updated] = await ctx.db
      .update(s.driveFolder)
      .set({ parentId: newParentId, path: newPath, updatedAt: new Date() })
      .where(eq(s.driveFolder.id, id))
      .returning();

    if (!updated) throw new Error(`Folder with id "${id}" not found.`);

    await ctx.step.run("cascade-paths", async () => {
      await cascadePaths({ newPath, oldPath }, ctx.db);
    });

    await ctx.pubsub.publish(DRIVE_EVENTS.MOVED, {
      item: { id: updated.id, name: updated.name, path: updated.path },
      itemType: "folder",
      newPath,
      oldPath,
    });

    return updated;
  });

export const updateFolder = Workflow.name("drive.folder.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    await ctx.step.run("check-exists", async () => {
      const [row] = await ctx.db
        .select({ id: s.driveFolder.id })
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, id))
        .limit(1);
      if (!row) throw new Error(`Folder with id "${id}" not found.`);
      return row;
    });
    const parsed = parse(UpdateFolderSchema, input);

    const [updated] = await ctx.db
      .update(s.driveFolder)
      .set({
        color: parsed.color,
        description: parsed.description,
        updatedAt: new Date(),
      })
      .where(eq(s.driveFolder.id, id))
      .returning();

    if (!updated) throw new Error(`Folder with id "${id}" not found.`);
    return updated;
  });

export const deleteFolder = Workflow.name("drive.folder.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id, force }, ctx) => {
    await ctx.step.run("check-exists", async () => {
      const [row] = await ctx.db
        .select({ id: s.driveFolder.id })
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, id))
        .limit(1);
      if (!row) throw new Error(`Folder with id "${id}" not found.`);
      return row;
    });

    const [childFolder] = await ctx.db
      .select({ id: s.driveFolder.id })
      .from(s.driveFolder)
      .where(
        and(eq(s.driveFolder.parentId, id), eq(s.driveFolder.isTrashed, false)),
      )
      .limit(1);

    const [childFile] = await ctx.db
      .select({ id: s.driveFile.id })
      .from(s.driveFile)
      .where(
        and(eq(s.driveFile.folderId, id), eq(s.driveFile.isTrashed, false)),
      )
      .limit(1);

    if ((childFolder || childFile) && !force) {
      throw new Error(
        "Cannot delete a non-empty folder. Use force=true or empty the folder first.",
      );
    }

    const [updated] = await ctx.db
      .update(s.driveFolder)
      .set({ isTrashed: true, trashedAt: new Date(), updatedAt: new Date() })
      .where(eq(s.driveFolder.id, id))
      .returning();

    if (!updated) throw new Error(`Folder with id "${id}" not found.`);

    await ctx.pubsub.publish(DRIVE_EVENTS.TRASHED, {
      itemId: id,
      itemType: "folder",
    });

    return updated;
  });

export const restoreFolder = Workflow.name("drive.folder.restore")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const fetched = await ctx.step.run("fetch-folder", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, id))
        .limit(1);
      if (!row) throw new Error(`Folder with id "${id}" not found.`);
      return row;
    });

    if (fetched.parentId) {
      const [parent] = await ctx.db
        .select({ id: s.driveFolder.id, isTrashed: s.driveFolder.isTrashed })
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, fetched.parentId))
        .limit(1);

      if (!parent || parent.isTrashed) {
        await ctx.db
          .update(s.driveFolder)
          .set({ parentId: null, updatedAt: new Date() })
          .where(eq(s.driveFolder.id, id));
      }
    }

    const [updated] = await ctx.db
      .update(s.driveFolder)
      .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
      .where(eq(s.driveFolder.id, id))
      .returning();

    if (!updated) throw new Error(`Folder with id "${id}" not found.`);

    await ctx.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "folder",
    });

    return updated;
  });

export const getFolder = Workflow.name("drive.folder.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const fetched = await ctx.step.run("fetch-folder", async () => {
      const [row] = await ctx.db
        .select()
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, id))
        .limit(1);
      if (!row) throw new Error(`Folder with id "${id}" not found.`);
      return row;
    });

    const [childCountRow] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(s.driveFolder)
      .where(
        and(eq(s.driveFolder.parentId, id), eq(s.driveFolder.isTrashed, false)),
      );

    const [fileCountRow] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(s.driveFile)
      .where(
        and(eq(s.driveFile.folderId, id), eq(s.driveFile.isTrashed, false)),
      );

    const [sizeRow] = await ctx.db
      .select({ totalSize: sql<number>`coalesce(sum(${s.driveFile.size}), 0)` })
      .from(s.driveFile)
      .where(
        and(
          sql`${s.driveFile.path} like ${`${fetched.path}/%`}`,
          eq(s.driveFile.isTrashed, false),
        ),
      );

    return {
      ...fetched,
      childCount: (childCountRow?.count ?? 0) + (fileCountRow?.count ?? 0),
      totalSize: sizeRow?.totalSize ?? 0,
    };
  });

export const listFolders = Workflow.name("drive.folder.list").handler(
  async (input, ctx) => {
    const { id, opts } = (input ?? {}) as {
      id?: string | null;
      opts?: ListFolderOptions;
    };
    const validated = parse(ListFolderOptionsSchema, opts ?? {});
    const limit = validated.limit ?? 50;
    const offset = validated.offset ?? 0;
    const sortBy = validated.sortBy ?? "name";
    const sortOrder = validated.sortOrder ?? "asc";

    const folderConditions = [
      eq(s.driveFolder.isTrashed, false),
      id
        ? eq(s.driveFolder.parentId, id)
        : sql`${s.driveFolder.parentId} IS NULL`,
    ];
    if (validated.search) {
      folderConditions.push(
        sql`${s.driveFolder.name} ilike ${`%${validated.search}%`}`,
      );
    }

    const folders = await ctx.db
      .select()
      .from(s.driveFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);

    const fileConditions = [
      eq(s.driveFile.isTrashed, false),
      id ? eq(s.driveFile.folderId, id) : sql`${s.driveFile.folderId} IS NULL`,
    ];
    if (validated.search) {
      fileConditions.push(
        sql`${s.driveFile.name} ilike ${`%${validated.search}%`}`,
      );
    }

    const files = await ctx.db
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
  },
);

export const folders = {
  create: createFolder,
  delete: deleteFolder,
  get: getFolder,
  getById: getFolderById,
  list: listFolders,
  move: moveFolder,
  rename: renameFolder,
  restore: restoreFolder,
  update: updateFolder,
};
