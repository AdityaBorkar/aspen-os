import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { dmsFile } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { checkNameUniqueness, computeFilePath, getFolderPath } from "../services/item-path-service";
import { computeStorageKey, upload as uploadStorage } from "../services/item-storage-bridge";
import { UploadItemFileSchema } from "../types";

const UploadInputSchema = object({ input: UploadItemFileSchema });

export const uploadItemFile = Workflow.name("dms.file.upload")
  .input(UploadInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UploadItemFileSchema, input);
    const folderId = parsed.folderId ?? null;

    const path = await ctx.step.run("compute-path", async () =>
      computeFilePath({ folderId, name: parsed.name }),
    );

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({ name: parsed.name, parentId: folderId });
    });

    const folderPath = folderId
      ? await ctx.step.run("get-folder-path", async () => getFolderPath({ folderId }))
      : "";

    const storageKey = computeStorageKey({ fileName: parsed.name, folderPath });

    const fileObject = await ctx.step.run("upload-storage", async () =>
      uploadStorage({
        body: parsed.body as Buffer | ReadableStream | string,
        contentType: parsed.contentType,
        key: storageKey,
      }),
    );

    const [file] = await ctx.db
      .insert(dmsFile)
      .values({
        contentType: parsed.contentType,
        description: parsed.description ?? null,
        etag: fileObject.etag,
        folderId,
        name: parsed.name,
        ownerId: parsed.ownerId,
        path,
        size: fileObject.size,
        storageKey,
      })
      .returning();

    if (!file) {
      throw new Error("Failed to upload file.");
    }

    await ctx.pubsub.publish(ITEM_EVENTS.FILE_UPLOADED, {
      file: {
        contentType: file.contentType,
        etag: file.etag,
        folderId: file.folderId,
        id: file.id,
        name: file.name,
        ownerId: file.ownerId,
        path: file.path,
        size: file.size,
        storageKey: file.storageKey,
        version: file.version,
      },
    });

    return file;
  });
