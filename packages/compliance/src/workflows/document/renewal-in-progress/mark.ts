import { complianceDocument } from "#/db-schemas";
import { VERIFICATION_STATUS } from "#/utils/constants";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { assertTransitionAllowed } from "#/workflows/document/transition";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const markRenewalInProgress = Workflow.name("document.mark-renewal-in-progress").handler(
  async (input: { id: string }, ctx) => {
    const { id } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    assertTransitionAllowed(current.verificationStatus, VERIFICATION_STATUS.SUBMITTED);

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: now, verificationStatus: VERIFICATION_STATUS.SUBMITTED })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "updated",
      actorId: current.createdBy,
      entityId: id,
      entityType: "compliance_document",
      metadata: { note: "Renewal in progress" },
      previousState: { verificationStatus: current.verificationStatus },
    });

    return updated;
  },
);

export { markRenewalInProgress };
