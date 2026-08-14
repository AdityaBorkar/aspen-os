import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsFile } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { checkNameUniqueness, computeFilePath, getFolderPath } from "../services/item-path-service";
import { computeStorageKey, move as moveStorage } from "../services/item-storage-bridge";
import { MoveItemFileSchema } from "../types";
import { fetchItemFileStep } from "../workflow-steps/fetch-item-file";
import { FileIdSchema } from "./item-utils";

const MoveInputSchema = object({ id: FileIdSchema, input: MoveItemFileSchema });

export const moveItemFile = Workflow.name("dms.file.move")
  .input(MoveInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchItemFileStep, { id });
    const parsed = parse(MoveItemFileSchema, input);
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
      .update(dmsFile)
      .set({
        folderId: newFolderId,
        path: newPath,
        storageKey: newStorageKey,
        updatedAt: new Date(),
      })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(ITEM_EVENTS.MOVED, {
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
