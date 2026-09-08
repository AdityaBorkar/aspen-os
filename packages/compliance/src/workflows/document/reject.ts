import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { VERIFICATION_STATUS } from "#/utils/constants";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { assertTransitionAllowed } from "#/workflows/document/transition";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const rejectDocument = Workflow.name("document.reject").handler(
  async (input: { id: string; reviewerId: string; reason: string }, ctx) => {
    const { id, reviewerId, reason } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    assertTransitionAllowed(current.verification_status, VERIFICATION_STATUS.REJECTED);

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({
        rejection_reason: reason,
        reviewed_at: now,
        reviewed_by: reviewerId,
        updated_at: now,
        verification_status: VERIFICATION_STATUS.REJECTED,
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
      previousState: { verification_status: current.verification_status },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_REJECTED, {
      category: updated.category,
      documentId: id,
      reason,
      rejectedBy: reviewerId,
      sourceEntityId: updated.source_entity_id,
      sourceModule: updated.source_module,
    });

    return updated;
  },
);

export { rejectDocument };
