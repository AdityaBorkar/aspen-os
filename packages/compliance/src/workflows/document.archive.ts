import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";
import { COMPLIANCE_EVENTS } from "../pubsub";
import { fetchDocumentStep } from "./steps/fetch-document";

const archiveDocument = Workflow.name("document.archive").handler(
  async (input: { id: string }, ctx) => {
    const { id } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: "archived" })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "archived",
      actorId: current.createdBy,
      entityId: id,
      entityType: "compliance_document",
      previousState: { verificationStatus: current.verificationStatus },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ARCHIVED, {
      documentId: id,
    });

    return updated;
  },
);

export { archiveDocument };
