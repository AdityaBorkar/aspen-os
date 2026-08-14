import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";
import { COMPLIANCE_EVENTS } from "../pubsub";
import { fetchDocumentStep } from "../workflow-steps/fetch-document";

const verifyDocument = Workflow.name("document.verify").handler(
  async (input: { id: string; reviewerId: string }, ctx) => {
    const { id, reviewerId } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    if (current.verificationStatus !== "under_review") {
      throw new Error(`Cannot verify document in status "${current.verificationStatus}"`);
    }

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({
        reviewedAt: now,
        reviewedBy: reviewerId,
        updatedAt: now,
        verificationStatus: "verified",
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "verified",
      actorId: reviewerId,
      entityId: id,
      entityType: "compliance_document",
      previousState: { verificationStatus: current.verificationStatus },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_VERIFIED, {
      category: updated.category,
      documentId: id,
      sourceEntityId: updated.sourceEntityId,
      sourceModule: updated.sourceModule,
      verifiedBy: reviewerId,
    });

    return updated;
  },
);

export { verifyDocument };
