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
      action: "updated",
      actorId: current.created_by,
      entityId: id,
      entityType: "document",
      metadata: { note: "Renewal in progress" },
      previousState: { verification_status: current.verification_status },
    });

    return updated;
  },
);

export { markRenewalInProgress };
