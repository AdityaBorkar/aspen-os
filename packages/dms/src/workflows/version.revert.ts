import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { integer, object, pipe, number as valibotNumber } from "valibot";

import { dmsDocument, dmsDocumentVersion } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { getDmsConfig } from "../runtime";
import { pruneVersions } from "../services/purge-service";
import {
  computeStorageKey,
  get as getStorage,
  upload as uploadStorage,
} from "../services/storage-bridge";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

const RevertInputSchema = object({
  documentId: IdSchema,
  version: pipe(valibotNumber(), integer()),
});

export const revertToVersion = Workflow.name("dms.version.revert")
  .input(RevertInputSchema)
  .handler(async ({ documentId, version }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId });

    if (doc.status === "deleted") {
      throw new Error(
        `Document "${documentId}" is deleted and cannot be reverted.`,
      );
    }

    if (version === doc.version) {
      throw new Error(`Version "${version}" is already the current version.`);
    }

    const target = await ctx.step.run("fetch-target-version", async () => {
      const [row] = await ctx.db
        .select()
        .from(dmsDocumentVersion)
        .where(
          and(
            eq(dmsDocumentVersion.documentId, documentId),
            eq(dmsDocumentVersion.version, version),
          ),
        )
        .limit(1);
      if (!row) {
        throw new Error(
          `Document "${documentId}" has no version "${version}".`,
        );
      }
      return row;
    });

    const config = getDmsConfig();
    const newVersionNumber = doc.version + 1;

    const storageKey = computeStorageKey({
      documentId,
      name: target.name,
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
      await ctx.db.insert(dmsDocumentVersion).values({
        compression: target.compression as never,
        contentType: target.contentType,
        documentId,
        etag: target.etag,
        isCurrent: true,
        name: target.name,
        size: target.size,
        storageKey,
        uploadedBy: ctx.actorId ?? doc.ownerId,
        version: newVersionNumber,
      });
    });

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({
        contentType: target.contentType,
        etag: target.etag,
        name: target.name,
        size: target.size,
        storageKey,
        updatedAt: new Date(),
        uploadedBy: ctx.actorId ?? doc.ownerId,
        version: newVersionNumber,
      })
      .where(eq(dmsDocument.id, documentId))
      .returning();

    await ctx.step.run("prune", async () => {
      await pruneVersions(ctx.db, documentId, config.maxVersions);
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.VERSION_REVERTED,
        crudAction: "update",
        entityId: documentId,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { revertedFrom: version, version: newVersionNumber },
        newState: { name: target.name, version: newVersionNumber },
        previousState: { name: doc.name, version: doc.version },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.VERSION_REVERTED, {
        documentId,
        version: newVersionNumber,
      });
    });

    return updated ?? doc;
  });
