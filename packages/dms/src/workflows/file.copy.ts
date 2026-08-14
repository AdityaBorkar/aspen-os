import { Workflow } from "@aspen-os/platform/server";
import { object, optional, string } from "valibot";

import { dmsFile } from "../db-schemas";
import { checkNameUniqueness, computeFilePath } from "../services/path-service";
import { computeStorageKey, copy as copyStorage } from "../services/storage-bridge";
import { FileIdSchema } from "../types";
import { fetchFileStep } from "../workflow-steps/fetch-file";

const CopyInputSchema = object({ destFolderId: optional(string()), id: FileIdSchema });

export const copyFile = Workflow.name("dms.file.copy")
  .input(CopyInputSchema)
  .handler(async ({ id, destFolderId }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const newFolderId = destFolderId ?? null;

    const newPath = newFolderId
      ? await ctx.step.run("compute-path", async () =>
          computeFilePath({ folderId: newFolderId, name: file.name }),
        )
      : null;

    if (newFolderId) {
      await ctx.step.run("check-name-uniqueness", async () => {
        await checkNameUniqueness({ name: file.name, parentId: newFolderId });
      });
    }

    const newFileId = crypto.randomUUID();
    const newStorageKey = computeStorageKey({ fileId: newFileId, name: file.name, version: 1 });

    const copied = await ctx.step.run("copy-storage", async () =>
      copyStorage({ destKey: newStorageKey, sourceKey: file.storageKey }),
    );

    const status = newFolderId ? ("active" as const) : ("triaged" as const);

    const [newFile] = await ctx.db
      .insert(dmsFile)
      .values({
        contentType: file.contentType,
        description: file.description,
        etag: copied.etag ?? null,
        folderId: newFolderId,
        id: newFileId,
        name: file.name,
        ownerId: file.ownerId,
        path: newPath,
        size: copied.size,
        status,
        storageKey: newStorageKey,
        uploadedBy: file.uploadedBy,
        version: 1,
      })
      .returning();

    if (!newFile) {
      throw new Error("Failed to copy file.");
    }

    return newFile;
  });
