import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { VERIFICATION_STATUS } from "#/utils/constants";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { assertTransitionAllowed } from "#/workflows/document/transition";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const archiveDocument = Workflow.name("document.archive").handler(
  async (input: { id: string }, ctx) => {
    const { id } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    if (current.verificationStatus === VERIFICATION_STATUS.ARCHIVED) {
      return current;
    }
    assertTransitionAllowed(current.verificationStatus, VERIFICATION_STATUS.ARCHIVED);

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: now, verificationStatus: VERIFICATION_STATUS.ARCHIVED })
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
