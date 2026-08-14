import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsFile, dmsFileVersion } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { getDmsConfig } from "../runtime";
import { computeStorageKey, upload as uploadStorage } from "../services/item-storage-bridge";
import { UpdateItemFileSchema } from "../types";
import { fetchItemFileStep } from "../workflow-steps/fetch-item-file";
import { FileIdSchema, pruneOldVersions } from "./item-utils";

const UpdateInputSchema = object({
  id: FileIdSchema,
  input: UpdateItemFileSchema,
});

export const updateItemFile = Workflow.name("dms.file.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchItemFileStep, { id });
    const parsed = parse(UpdateItemFileSchema, input);
    const config = getDmsConfig();

    await ctx.step.run("save-version", async () => {
      await ctx.db.insert(dmsFileVersion).values({
        contentType: file.contentType,
        etag: file.etag,
        fileId: file.id,
        size: file.size,
        storageKey: file.storageKey,
        uploadedBy: parsed.uploadedBy,
        version: file.version,
      });
    });

    const contentType = parsed.contentType ?? file.contentType;
    const storageKey = computeStorageKey({
      fileName: file.name,
      folderPath: file.path.substring(0, file.path.lastIndexOf("/")) || "/",
    });

    const fileObject = await ctx.step.run("upload-storage", async () =>
      uploadStorage({
        body: parsed.body as Buffer | ReadableStream | string,
        contentType,
        key: storageKey,
      }),
    );

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({
        contentType,
        etag: fileObject.etag,
        size: fileObject.size,
        storageKey,
        updatedAt: new Date(),
        version: file.version + 1,
      })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await ctx.step.run("prune-old-versions", async () => {
      await pruneOldVersions(ctx.db, id, config.maxVersions);
    });

    await ctx.pubsub.publish(ITEM_EVENTS.FILE_UPDATED, {
      file: {
        contentType: updated.contentType,
        etag: updated.etag,
        id: updated.id,
        name: updated.name,
        ownerId: updated.ownerId,
        path: updated.path,
        size: updated.size,
        storageKey: updated.storageKey,
        version: updated.version,
      },
      previousVersion: file.version,
    });

    return updated;
  });
