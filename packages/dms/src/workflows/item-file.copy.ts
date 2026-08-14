import { Workflow } from "@aspen-os/platform/server";
import { object, optional, string } from "valibot";

import { dmsFile } from "../db-schemas";
import {
  checkNameUniqueness,
  computeFilePath,
  getFolderPath,
} from "../services/item-path-service";
import {
  computeStorageKey,
  copy as copyStorage,
} from "../services/item-storage-bridge";
import { FileIdSchema } from "./item-utils";
import { fetchItemFileStep } from "./steps/fetch-item-file";

const CopyInputSchema = object({
  destFolderId: optional(string()),
  id: FileIdSchema,
});

export const copyItemFile = Workflow.name("dms.file.copy")
  .input(CopyInputSchema)
  .handler(async ({ id, destFolderId }, ctx) => {
    const file = await ctx.step.run(fetchItemFileStep, { id });

    const folderId = destFolderId ?? null;
    const newPath = await ctx.step.run("compute-path", async () =>
      computeFilePath({ folderId, name: file.name }),
    );

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({ name: file.name, parentId: folderId });
    });

    const folderPath = folderId
      ? await ctx.step.run("get-folder-path", async () =>
          getFolderPath({ folderId }),
        )
      : "";
    const newStorageKey = computeStorageKey({
      fileName: file.name,
      folderPath,
    });

    await ctx.step.run("copy-storage", async () => {
      await copyStorage({
        destKey: newStorageKey,
        sourceKey: file.storageKey,
      });
    });

    const [copied] = await ctx.db
      .insert(dmsFile)
      .values({
        contentType: file.contentType,
        description: file.description,
        etag: file.etag,
        folderId,
        name: file.name,
        ownerId: file.ownerId,
        path: newPath,
        size: file.size,
        storageKey: newStorageKey,
      })
      .returning();

    if (!copied) {
      throw new Error("Failed to copy file.");
    }

    return copied;
  });
