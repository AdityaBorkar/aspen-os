import { Workflow } from "@aspen-os/platform/server";
import { count } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, parse } from "valibot";

import { dmsDocument, dmsTag } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { getDmsConfig } from "../runtime";
import { getSetting } from "../services/settings-service";
import { computeStorageKey, upload as uploadStorage } from "../services/storage-bridge";
import { UploadDocumentSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, SETTING_KEYS } from "../utils/constants";

const UploadInputSchema = object({ input: UploadDocumentSchema });

const MAX_SEQ = 999999;

async function nextDocNumber(db: NodePgDatabase): Promise<string> {
  const rows = await db.select({ value: count(dmsDocument.id) }).from(dmsDocument);
  const value = rows[0]?.value ?? 0;
  const seq = (value + 1) % (MAX_SEQ + 1);
  return `DOC-${String(seq).padStart(6, "0")}`;
}

export const uploadDocument = Workflow.name("dms.document.upload")
  .input(UploadInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UploadDocumentSchema, input);
    const config = getDmsConfig();

    if (config.allowedContentTypes.length > 0) {
      if (!config.allowedContentTypes.includes(parsed.contentType)) {
        throw new Error(`Content type "${parsed.contentType}" is not allowed.`);
      }
    }

    const defaultCompression = (await ctx.step.run("resolve-compression", async () => {
      const setting = (await getSetting(ctx.db, SETTING_KEYS.DEFAULT_COMPRESSION)) as
        | typeof config.defaultCompression
        | null;
      return setting ?? config.defaultCompression;
    })) ?? { enabled: true, mode: "none" };

    const compression = parsed.compression ?? defaultCompression;
    const actorId = ctx.actorId ?? parsed.uploadedBy ?? parsed.ownerId;

    const docNumber = await ctx.step.run("next-doc-number", async () => nextDocNumber(ctx.db));

    const documentId = crypto.randomUUID();
    const storageKey = computeStorageKey({
      documentId,
      name: parsed.name,
      version: 1,
    });

    const fileObject = await ctx.step.run("upload-storage", async () =>
      uploadStorage({
        body: parsed.body as Buffer | ReadableStream | string,
        contentType: parsed.contentType,
        key: storageKey,
      }),
    );

    const [document] = await ctx.db
      .insert(dmsDocument)
      .values({
        batchId: parsed.batchId ?? null,
        compression,
        contentType: parsed.contentType,
        docNumber,
        etag: fileObject.etag ?? null,
        id: documentId,
        metadata: parsed.metadata ?? {},
        name: parsed.name,
        ownerId: parsed.ownerId,
        size: fileObject.size,
        status: "triaged",
        storageKey,
        tags: parsed.tags ?? [],
        uploadedBy: actorId,
        version: 1,
      })
      .returning();

    if (!document) {
      throw new Error("Failed to create triaged document.");
    }

    await ctx.step.run("ensure-tags", async () => {
      await Promise.all(
        (parsed.tags ?? []).map(async (tagName) => {
          await ctx.db.insert(dmsTag).values({ name: tagName }).onConflictDoNothing();
        }),
      );
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPLOADED,
        crudAction: "create",
        entityId: document.id,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { batchId: parsed.batchId ?? null, version: 1 },
        newState: {
          contentType: document.contentType,
          id: document.id,
          name: document.name,
          size: document.size,
          status: "triaged",
          storageKey: document.storageKey,
        },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.UPLOADED, {
        batchId: parsed.batchId ?? undefined,
        contentType: document.contentType,
        documentId: document.id,
        size: document.size,
        version: document.version,
      });
    });

    return document;
  });
