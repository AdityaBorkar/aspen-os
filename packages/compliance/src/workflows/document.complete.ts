import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";
import { COMPLIANCE_EVENTS } from "../pubsub";
import { fetchDocumentStep } from "./steps/fetch-document";

const completeDocument = Workflow.name("document.complete").handler(
  async (
    input: {
      id: string;
      data: {
        completedAt?: Date;
        referenceNumber?: string;
        attachmentKey?: string;
      };
    },
    ctx,
  ) => {
    const { id, data } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });
    const completedAt = data.completedAt ?? new Date();

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({
        attachment: data.attachmentKey ?? current.attachment,
        completedAt,
        referenceNumber: data.referenceNumber ?? current.referenceNumber,
        updatedAt: new Date(),
        verificationStatus: "verified",
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

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
