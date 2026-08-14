import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsDocument, dmsDocumentVersion } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { getDmsConfig } from "../runtime";
import { pruneVersions } from "../services/purge-service";
import { computeStorageKey, upload as uploadStorage } from "../services/storage-bridge";
import { IdSchema, NewVersionSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentStep } from "../workflow-steps/fetch-document";

const NewVersionInputSchema = object({
  documentId: IdSchema,
  input: NewVersionSchema,
});

export const newDocumentVersion = Workflow.name("dms.version.new")
  .input(NewVersionInputSchema)
  .handler(async ({ documentId, input }, ctx) => {
    const parsed = parse(NewVersionSchema, input);
    const doc = await ctx.step.run(fetchDocumentStep, { documentId });

    if (doc.status === "deleted") {
      throw new Error(`Document "${documentId}" is deleted and cannot accept new versions.`);
    }
    if (doc.status === "triaged") {
      throw new Error(
        `Document "${documentId}" is triaged and has exactly one version. Classify it first.`,
      );
    }

    const config = getDmsConfig();
    const newVersion = doc.version + 1;

    const name = parsed.name ?? doc.name;
    const storageKey = computeStorageKey({
      documentId,
      name,
      version: newVersion,
    });

    const fileObject = await ctx.step.run("upload-storage", async () =>
      uploadStorage({
        body: parsed.body as Buffer | ReadableStream | string,
        contentType: parsed.contentType ?? doc.contentType,
        key: storageKey,
      }),
    );

    await ctx.step.run("record-history", async () => {
      await ctx.db.insert(dmsDocumentVersion).values({
        compression: doc.compression as never,
        contentType: doc.contentType,
        documentId,
        etag: doc.etag,
        isCurrent: false,
        name: doc.name,
        size: doc.size,
        storageKey: doc.storageKey,
        uploadedBy: doc.uploadedBy,
        version: doc.version,
      });
    });

    const actorId = ctx.actorId ?? parsed.uploadedBy ?? doc.ownerId;

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({
        contentType: parsed.contentType ?? doc.contentType,
        etag: fileObject.etag ?? null,
        name,
        size: fileObject.size,
        storageKey,
        updatedAt: new Date(),
        uploadedBy: actorId,
        version: newVersion,
      })
      .where(eq(dmsDocument.id, documentId))
      .returning();

    if (!updated) {
      throw new Error(`Document with id "${documentId}" not found.`);
    }

    await ctx.step.run("prune", async () => {
      await pruneVersions(ctx.db, documentId, config.maxVersions);
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.VERSION_ADDED,
        crudAction: "create",
        entityId: documentId,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { version: newVersion },
        newState: { name, size: fileObject.size, version: newVersion },
        previousState: { name: doc.name, size: doc.size, version: doc.version },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.VERSION_ADDED, {
        documentId,
        version: newVersion,
      });
    });

    return updated;
  });
