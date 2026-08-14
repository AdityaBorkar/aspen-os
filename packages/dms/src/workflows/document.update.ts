import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsDocument } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { IdSchema, UpdateDocumentSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { stripUndefined } from "../utils/strip-undefined";
import { fetchDocumentStep } from "../workflow-steps/fetch-document";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateDocumentSchema,
});

export const updateDocument = Workflow.name("dms.document.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdateDocumentSchema, patch);
    const current = await ctx.step.run(fetchDocumentStep, { documentId: id });

    const updates = stripUndefined({
      compression: parsed.compression,
      metadata: parsed.metadata,
      name: parsed.name,
      tags: parsed.tags,
    });

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dmsDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Document with id "${id}" not found.`);
    }

    const changes = ctx.audit.diff(
      {
        compression: current.compression,
        metadata: current.metadata,
        name: current.name,
        tags: current.tags,
      },
      {
        compression: updated.compression,
        metadata: updated.metadata,
        name: updated.name,
        tags: updated.tags,
      },
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        newState: {
          compression: updated.compression,
          metadata: updated.metadata,
          name: updated.name,
          tags: updated.tags,
        },
        previousState: {
          compression: current.compression,
          metadata: current.metadata,
          name: current.name,
          tags: current.tags,
        },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.UPDATED, {
        changes: changes ?? {},
        documentId: id,
      });
    });

    return updated;
  });
