import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { VERIFICATION_STATUS } from "#/utils/constants";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { assertTransitionAllowed } from "#/workflows/document/transition";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const submitDocument = Workflow.name("document.submit").handler(
  async (input: { id: string }, ctx) => {
    const { id } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    assertTransitionAllowed(current.verification_status, VERIFICATION_STATUS.SUBMITTED);

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updated_at: now, verification_status: VERIFICATION_STATUS.SUBMITTED })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "submitted",
      actorId: current.created_by,
      entityId: id,
      entityType: "compliance_document",
      previousState: { verification_status: current.verification_status },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_SUBMITTED, {
      documentId: id,
      submittedBy: current.created_by,
    });

    return updated;
  },
);

export { submitDocument };
