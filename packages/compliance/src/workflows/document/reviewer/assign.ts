import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { VERIFICATION_STATUS } from "#/utils/constants";
import type { VerificationStatus } from "#/utils/constants";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const assignDocumentReviewer = Workflow.name("document.assign-reviewer").handler(
  async (input: { id: string; userId: string }, ctx) => {
    const { id, userId } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    let newStatus: VerificationStatus = current.verification_status;
    if (
      current.verification_status === VERIFICATION_STATUS.SUBMITTED ||
      current.verification_status === VERIFICATION_STATUS.REJECTED
    ) {
      newStatus = VERIFICATION_STATUS.UNDER_REVIEW;
    }

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({
        assigned_reviewer: userId,
        updated_at: now,
        verification_status: newStatus,
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "reviewer_assigned",
      actorId: userId,
      entityId: id,
      entityType: "document",
      metadata: {
        reviewerId: userId,
        statusTransitioned:
          newStatus !== current.verification_status
            ? `${current.verification_status}->${newStatus}`
            : null,
      },
      previousState: {
        assignedReviewer: current.assigned_reviewer,
        verificationStatus: current.verification_status,
      },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_REVIEWER_ASSIGNED, {
      documentId: id,
      reviewerId: userId,
    });

    return updated;
  },
);

export { assignDocumentReviewer };
