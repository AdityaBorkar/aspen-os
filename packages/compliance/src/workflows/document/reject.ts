import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const rejectDocument = Workflow.name("document.reject").handler(
  async (input: { id: string; reviewerId: string; reason: string }, ctx) => {
    const { id, reviewerId, reason } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    if (current.verificationStatus !== "under_review") {
      throw new Error(`Cannot reject document in status "${current.verificationStatus}"`);
    }

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        updatedAt: new Date(),
        verificationStatus: "rejected",
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "rejected",
      actorId: reviewerId,
      entityId: id,
      entityType: "compliance_document",
      metadata: { reason },
      previousState: { verificationStatus: current.verificationStatus },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_REJECTED, {
      category: updated.category,
      documentId: id,
      reason,
      rejectedBy: reviewerId,
      sourceEntityId: updated.sourceEntityId,
      sourceModule: updated.sourceModule,
    });

    return updated;
  },
);

export { rejectDocument };
