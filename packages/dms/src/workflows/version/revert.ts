import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { integer, object, pipe, number as valibotNumber } from "valibot";

import { dmsFile, dmsFileVersion } from "../../db-schemas";
import { FILE_EVENTS } from "../../pubsub";
import { getDmsConfig } from "../../runtime";
import { pruneVersions } from "../../services/purge-service";
import {
  computeStorageKey,
  get as getStorage,
  upload as uploadStorage,
} from "../../services/storage-bridge";
import { IdSchema } from "../../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../../utils/constants";
import { fetchFileStep } from "../../workflow-steps/fetch-file";

const RevertInputSchema = object({
  fileId: IdSchema,
  version: pipe(valibotNumber(), integer()),
});

export const revertToVersion = Workflow.name("dms.version.revert")
  .input(RevertInputSchema)
  .handler(async ({ fileId, version }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id: fileId });

    if (file.status === "trashed") {
      throw new Error(`File "${fileId}" is trashed and cannot be reverted.`);
    }

    if (version === file.version) {
      throw new Error(`Version "${version}" is already the current version.`);
    }

    const target = await ctx.step.run("fetch-target-version", async () => {
      const [row] = await ctx.db
        .select()
        .from(dmsFileVersion)
        .where(and(eq(dmsFileVersion.fileId, fileId), eq(dmsFileVersion.version, version)))
        .limit(1);
      if (!row) {
        throw new Error(`File "${fileId}" has no version "${version}".`);
      }
      return row;
    });

    const config = getDmsConfig();
    const newVersionNumber = file.version + 1;

    const storageKey = computeStorageKey({
      fileId,
      name: target.name ?? file.name,
      version: newVersionNumber,
    });

    await ctx.step.run("copy-bytes", async () => {
      const bytes = await getStorage({ key: target.storageKey });
      await uploadStorage({
        body: bytes,
        contentType: target.contentType,
        key: storageKey,
      });
    });

    await ctx.step.run("record-history", async () => {
      await ctx.db.insert(dmsFileVersion).values({
        compression: target.compression as never,
        contentType: target.contentType,
        etag: target.etag,
        fileId,
        isCurrent: true,
        name: target.name,
        size: target.size,
        storageKey,
        uploadedBy: ctx.actorId ?? file.ownerId,
        version: newVersionNumber,
      });
    });

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({
        contentType: target.contentType,
        etag: target.etag,
        name: target.name ?? file.name,
        size: target.size,
        storageKey,
        updatedAt: new Date(),
        uploadedBy: ctx.actorId ?? file.ownerId,
        version: newVersionNumber,
      })
      .where(eq(dmsFile.id, fileId))
      .returning();

    await ctx.step.run("prune", async () => {
      await pruneVersions(ctx.db, fileId, config.maxVersions);
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.VERSION_REVERTED,
        crudAction: "update",
        entityId: fileId,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { revertedFrom: version, version: newVersionNumber },
        newState: { name: target.name, version: newVersionNumber },
        previousState: { name: file.name, version: file.version },
      });

      await ctx.pubsub.publish(FILE_EVENTS.VERSION_REVERTED, {
        fileId,
        version: newVersionNumber,
      });
    });

    return updated ?? file;
  });
