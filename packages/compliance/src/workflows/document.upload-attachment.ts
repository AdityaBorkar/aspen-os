import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";
import { COMPLIANCE_EVENTS } from "../pubsub";
import { fetchDocumentStep } from "./steps/fetch-document";

const uploadDocumentAttachment = Workflow.name("document.upload-attachment").handler(
  async (input: { id: string; storageKey: string }, ctx) => {
    const { id, storageKey } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ attachment: storageKey, updatedAt: new Date() })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "attachment_uploaded",
      actorId: current.createdBy,
      entityId: id,
      entityType: "compliance_document",
      metadata: { storageKey },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ATTACHMENT_UPLOADED, {
      documentId: id,
      storageKey,
    });

    return updated;
  },
);

export { uploadDocumentAttachment };
