import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { VERIFICATION_STATUS } from "#/utils/constants";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { assertTransitionAllowed } from "#/workflows/document/transition";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const completeDocument = Workflow.name("document.complete").handler(
  async (
    input: {
      id: string;
      data: {
        completedAt?: Date;
        referenceNumber?: string | null;
        attachmentKey?: string;
      };
    },
    ctx,
  ) => {
    const { id, data } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });
    const completedAt = data.completedAt ?? new Date();
    if (!Number.isFinite(completedAt.getTime())) {
      throw new Error("completedAt must be a valid Date");
    }

    if (current.verificationStatus !== VERIFICATION_STATUS.VERIFIED) {
      assertTransitionAllowed(current.verificationStatus, VERIFICATION_STATUS.VERIFIED);
    }

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({
        attachment: data.attachmentKey ?? current.attachment,
        completedAt,
        referenceNumber: data.referenceNumber ?? current.referenceNumber,
        updatedAt: now,
        verificationStatus: VERIFICATION_STATUS.VERIFIED,
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "completed",
      actorId: current.createdBy,
      entityId: id,
      entityType: "compliance_document",
      metadata: {
        completedAt: completedAt.toISOString(),
        referenceNumber: data.referenceNumber ?? null,
      },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_COMPLETED, {
      completedAt: completedAt.toISOString(),
      documentId: id,
      referenceNumber: data.referenceNumber ?? null,
      sourceEntityId: updated.sourceEntityId,
      sourceModule: updated.sourceModule,
    });

    return updated;
  },
);

export { completeDocument };
