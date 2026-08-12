import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";
import { COMPLIANCE_EVENTS } from "../pubsub";
import type { VerificationStatus } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

const assignDocumentReviewer = Workflow.name(
  "document.assign-reviewer",
).handler(async (input: { id: string; userId: string }, ctx) => {
  const { id, userId } = input;
  const current = await ctx.step.run(fetchDocumentStep, { id });

  const newStatus: VerificationStatus =
    current.verificationStatus === "submitted" ||
    current.verificationStatus === "rejected"
      ? "under_review"
      : current.verificationStatus;

  const [updated] = await ctx.db
    .update(complianceDocument)
    .set({
      assignedReviewer: userId,
      updatedAt: new Date(),
      verificationStatus: newStatus,
    })
    .where(eq(complianceDocument.id, id))
    .returning();

  if (!updated) throw new Error("Database operation returned no result");

  await ctx.audit.write({
    action: "reviewer_assigned",
    actorId: userId,
    entityId: id,
    entityType: "compliance_document",
    metadata: { reviewerId: userId },
    previousState: {
      assignedReviewer: current.assignedReviewer,
      verificationStatus: current.verificationStatus,
    },
  });

  await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_REVIEWER_ASSIGNED, {
    documentId: id,
    reviewerId: userId,
  });

  return updated;
});

export { assignDocumentReviewer };
