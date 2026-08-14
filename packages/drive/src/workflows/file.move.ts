import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { driveFile } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { checkNameUniqueness, computeFilePath, getFolderPath } from "../services/path-service";
import { computeStorageKey, move as moveStorage } from "../services/storage-bridge";
import { MoveFileSchema } from "../types";
import { fetchFileStep } from "./steps/fetch-file";
import { FileIdSchema } from "./utils";

const MoveInputSchema = object({ id: FileIdSchema, input: MoveFileSchema });

export const moveFile = Workflow.name("drive.file.move")
  .input(MoveInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const parsed = parse(MoveFileSchema, input);
    const newFolderId = parsed.newFolderId ?? null;

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({
        excludeId: id,
        name: file.name,
        parentId: newFolderId,
      });
    });

    const oldPath = file.path;
    const newPath = await ctx.step.run("compute-path", async () =>
      computeFilePath({ folderId: newFolderId, name: file.name }),
    );

    const newFolderPath = newFolderId
      ? await ctx.step.run("get-folder-path", async () => getFolderPath({ folderId: newFolderId }))
      : "";
    const newStorageKey = computeStorageKey({
      fileName: file.name,
      folderPath: newFolderPath,
    });

    await ctx.step.run("move-storage", async () => {
      await moveStorage({
        destKey: newStorageKey,
        sourceKey: file.storageKey,
      });
    });

    const [updated] = await ctx.db
      .update(driveFile)
      .set({
        folderId: newFolderId,
        path: newPath,
        storageKey: newStorageKey,
        updatedAt: new Date(),
      })
      .where(eq(driveFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(DRIVE_EVENTS.MOVED, {
      item: {
        id: updated.id,
        name: updated.name,
        path: updated.path,
      },
      itemType: "file",
      newPath,
      oldPath,
    });

    return updated;
  });
