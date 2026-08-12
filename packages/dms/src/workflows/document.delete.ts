import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsDocument } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

const DeleteInputSchema = object({ id: IdSchema });

export const deleteDocument = Workflow.name("dms.document.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });

    if (doc.status === "deleted") {
      throw new Error(`Document "${id}" is already in the recycle bin.`);
    }

    const deletedBy = ctx.actorId ?? "unknown";

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({
        deletedAt: new Date(),
        deletedBy,
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(dmsDocument.id, id))
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { deletedBy },
        newState: { status: "deleted" },
        previousState: { status: doc.status },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.DELETED, {
        deletedBy,
        documentId: id,
      });
    });

    return updated ?? doc;
  });
