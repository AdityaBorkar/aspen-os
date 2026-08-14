import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string, unknown } from "valibot";

import { dmsDocument, dmsTag } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { IdSchema, TagDocumentSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

const TagInputSchema = object({ id: IdSchema, input: TagDocumentSchema });

export const tagDocument = Workflow.name("dms.document.tag")
  .input(TagInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });
    const { tag } = input;

    const tags = doc.tags ?? [];
    if (tags.includes(tag)) {
      return doc;
    }

    await ctx.db.insert(dmsTag).values({ name: tag }).onConflictDoNothing();

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({ tags: [...tags, tag], updatedAt: new Date() })
      .where(eq(dmsDocument.id, id))
      .returning();

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
      newState: { tags: updated?.tags ?? [...tags, tag] },
      previousState: { tags },
    });

    await ctx.pubsub.publish(DOCUMENT_EVENTS.TAGGED, { documentId: id, tag });

    return updated ?? doc;
  });

export const untagDocument = Workflow.name("dms.document.untag")
  .input(TagInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });
    const { tag } = input;

    const tags = (doc.tags ?? []).filter((t) => t !== tag);

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({ tags, updatedAt: new Date() })
      .where(eq(dmsDocument.id, id))
      .returning();

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
      newState: { tags },
      previousState: { tags: doc.tags ?? [] },
    });

    await ctx.pubsub.publish(DOCUMENT_EVENTS.UNTAGGED, { documentId: id, tag });

    return updated ?? doc;
  });

export const addDocumentMetadata = Workflow.name("dms.document.add-metadata")
  .input(
    object({
      id: IdSchema,
      input: object({ key: string(), value: unknown() }),
    }),
  )
  .handler(async ({ id, input }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });
    const metadata = {
      ...((doc.metadata as Record<string, unknown> | null) ?? {}),
      [input.key]: input.value,
    };

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({ metadata, updatedAt: new Date() })
      .where(eq(dmsDocument.id, id))
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { key: input.key },
        newState: { metadata },
        previousState: { metadata: doc.metadata },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.UPDATED, {
        changes: { [input.key]: input.value },
        documentId: id,
      });
    });

    return updated ?? doc;
  });

export const removeDocumentMetadata = Workflow.name("dms.document.remove-metadata")
  .input(object({ id: IdSchema, input: object({ key: string() }) }))
  .handler(async ({ id, input }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });
    const metadata = {
      ...((doc.metadata as Record<string, unknown> | null) ?? {}),
    };
    delete metadata[input.key];

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({ metadata, updatedAt: new Date() })
      .where(eq(dmsDocument.id, id))
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { key: input.key },
        newState: { metadata },
        previousState: { metadata: doc.metadata },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.UPDATED, {
        changes: { [input.key]: null },
        documentId: id,
      });
    });

    return updated ?? doc;
  });
