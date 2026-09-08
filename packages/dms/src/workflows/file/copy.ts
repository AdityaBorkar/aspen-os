import { dmsFile } from "#/db-schemas";
import { computeStorageKey, copy as copyStorage } from "#/services/storage-bridge";
import { FileIdSchema } from "#/types";
import { fetchFileStep } from "#/workflow-steps/fetch-file";
import { checkNameUniqueness, computeFilePath } from "#/workflow-steps/path-service";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, string } from "valibot";

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
      copyStorage({ destKey: newStorageKey, sourceKey: file.storage_key }),
    );

    const status = newFolderId ? ("active" as const) : ("triaged" as const);

    const [newFile] = await ctx.db
      .insert(dmsFile)
      .values({
        content_type: file.content_type,
        description: file.description,
        etag: copied.etag ?? null,
        folder_id: newFolderId,
        id: newFileId,
        name: file.name,
        owner_id: file.owner_id,
        path: newPath,
        size: copied.size,
        status,
        storage_key: newStorageKey,
        uploaded_by: file.uploaded_by,
        version: 1,
      })
      .returning();

    if (!newFile) {
      throw new Error("Failed to copy file.");
    }

    return newFile;
  });
