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

    if (current.verification_status === VERIFICATION_STATUS.ARCHIVED) {
      return current;
    }
    assertTransitionAllowed(current.verification_status, VERIFICATION_STATUS.ARCHIVED);

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updated_at: now, verification_status: VERIFICATION_STATUS.ARCHIVED })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "archived",
      actorId: current.created_by,
      entityId: id,
      entityType: "document",
      previousState: { verification_status: current.verification_status },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ARCHIVED, {
      documentId: id,
    });

    return updated;
  },
);

export { archiveDocument };
