import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsFile, dmsFileVersion } from "../../db-schemas";
import { FILE_EVENTS } from "../../pubsub";
import { getDmsConfig } from "../../runtime";
import { pruneVersions } from "../../services/purge-service";
import { computeStorageKey, upload as uploadStorage } from "../../services/storage-bridge";
import { IdSchema, NewVersionSchema } from "../../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../../utils/constants";
import { fetchFileStep } from "../../workflow-steps/fetch-file";

const NewVersionInputSchema = object({
  fileId: IdSchema,
  input: NewVersionSchema,
});

export const newFileVersion = Workflow.name("dms.version.new")
  .input(NewVersionInputSchema)
  .handler(async ({ fileId, input }, ctx) => {
    const parsed = parse(NewVersionSchema, input);
    const file = await ctx.step.run(fetchFileStep, { id: fileId });

    if (file.status === "trashed") {
      throw new Error(`File "${fileId}" is trashed and cannot accept new versions.`);
    }
    if (file.status === "triaged") {
      throw new Error(
        `File "${fileId}" is triaged and has exactly one version. Classify it first.`,
      );
    }

    const config = getDmsConfig();
    const newVersion = file.version + 1;

    const name = parsed.name ?? file.name;
    const storageKey = computeStorageKey({
      fileId,
      name,
      version: newVersion,
    });

    const fileObject = await ctx.step.run("upload-storage", async () =>
      uploadStorage({
        body: parsed.body as Buffer | ReadableStream | string,
        contentType: parsed.contentType ?? file.contentType,
        key: storageKey,
      }),
    );

    await ctx.step.run("record-history", async () => {
      await ctx.db.insert(dmsFileVersion).values({
        compression: file.compression as never,
        contentType: file.contentType,
        etag: file.etag,
        fileId,
        isCurrent: false,
        name: file.name,
        size: file.size,
        storageKey: file.storageKey,
        uploadedBy: file.uploadedBy,
        version: file.version,
      });
    });

    const actorId = ctx.actorId ?? parsed.uploadedBy ?? file.ownerId;

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({
        contentType: parsed.contentType ?? file.contentType,
        etag: fileObject.etag ?? null,
        name,
        size: fileObject.size,
        storageKey,
        updatedAt: new Date(),
        uploadedBy: actorId,
        version: newVersion,
      })
      .where(eq(dmsFile.id, fileId))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${fileId}" not found.`);
    }

    await ctx.step.run("prune", async () => {
      await pruneVersions(ctx.db, fileId, config.maxVersions);
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.VERSION_ADDED,
        crudAction: "create",
        entityId: fileId,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { version: newVersion },
        newState: { name, size: fileObject.size, version: newVersion },
        previousState: { name: file.name, size: file.size, version: file.version },
      });

      await ctx.pubsub.publish(FILE_EVENTS.VERSION_ADDED, {
        fileId,
        version: newVersion,
      });
    });

    return updated;
  });
