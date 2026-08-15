import { dmsEntityLabel, dmsFile, dmsLabel } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { getDmsConfig } from "#/runtime";
import { checkNameUniqueness, computeFilePath } from "#/services/path-service";
import { getSetting, isCompressionOption } from "#/services/settings-service";
import { computeStorageKey, upload as uploadStorage } from "#/services/storage-bridge";
import { UploadFileSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, SETTING_KEYS } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { inArray } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const UploadInputSchema = object({ input: UploadFileSchema });

export const uploadFile = Workflow.name("dms.file.upload")
  .input(UploadInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UploadFileSchema, input);
    const config = getDmsConfig();

    if (config.allowedContentTypes.length > 0) {
      if (!config.allowedContentTypes.includes(parsed.contentType)) {
        throw new Error(`Content type "${parsed.contentType}" is not allowed.`);
      }
    }

    const folderId = parsed.folderId ?? null;

    const defaultCompression = await ctx.step.run("resolve-compression", async () => {
      const setting = await getSetting(ctx.db, SETTING_KEYS.DEFAULT_COMPRESSION);
      return isCompressionOption(setting) ? setting : config.defaultCompression;
    });

    const compression = parsed.compression ?? defaultCompression;
    const actorId = ctx.actorId ?? parsed.uploadedBy ?? parsed.ownerId;

    const path = folderId
      ? await ctx.step.run("compute-path", async () =>
          computeFilePath({ folderId, name: parsed.name }),
        )
      : null;

    if (folderId) {
      await ctx.step.run("check-name-uniqueness", async () => {
        await checkNameUniqueness({ name: parsed.name, parentId: folderId });
      });
    }

    const fileId = crypto.randomUUID();
    const storageKey = computeStorageKey({ fileId, name: parsed.name, version: 1 });

    const { body } = parsed;
    if (!(body instanceof Buffer) && !(body instanceof ReadableStream) && !is(string(), body)) {
      throw new Error("Invalid file body: expected a string, Buffer, or ReadableStream.");
    }

    const fileObject = await ctx.step.run("upload-storage", async () =>
      uploadStorage({
        body,
        contentType: parsed.contentType,
        key: storageKey,
      }),
    );

    const status = folderId ? ("active" as const) : ("triaged" as const);

    const [file] = await ctx.db
      .insert(dmsFile)
      .values({
        batchId: parsed.batchId ?? null,
        compression,
        contentType: parsed.contentType,
        description: parsed.description ?? null,
        etag: fileObject.etag ?? null,
        folderId,
        id: fileId,
        metadata: parsed.metadata ?? {},
        name: parsed.name,
        ownerId: parsed.ownerId,
        path,
        size: fileObject.size,
        status,
        storageKey,
        uploadedBy: actorId,
        version: 1,
      })
      .returning();

    if (!file) {
      throw new Error("Failed to upload file.");
    }

    if (parsed.labelIds && parsed.labelIds.length > 0) {
      await ctx.step.run("apply-labels", async () => {
        const labels = await ctx.db
          .select({ id: dmsLabel.id })
          .from(dmsLabel)
          .where(inArray(dmsLabel.id, parsed.labelIds ?? []));
        const validIds = new Set(labels.map((label) => label.id));
        const rows = (parsed.labelIds ?? [])
          .filter((labelId) => validIds.has(labelId))
          .map((labelId) => ({
            appliedBy: actorId,
            entityId: file.id,
            entityType: "file" as const,
            labelId,
          }));
        if (rows.length > 0) {
          await ctx.db.insert(dmsEntityLabel).values(rows).onConflictDoNothing();
        }
      });
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPLOADED,
        crudAction: "create",
        entityId: file.id,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { batchId: parsed.batchId ?? null, version: 1 },
        newState: {
          contentType: file.contentType,
          id: file.id,
          name: file.name,
          size: file.size,
          status: file.status,
          storageKey: file.storageKey,
        },
      });

      await ctx.pubsub.publish(FILE_EVENTS.UPLOADED, {
        batchId: parsed.batchId ?? undefined,
        contentType: file.contentType,
        fileId: file.id,
        size: file.size,
        version: file.version,
      });
    });

    return file;
  });
