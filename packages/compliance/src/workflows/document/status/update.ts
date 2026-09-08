import { complianceDocument } from "#/db-schemas";
import type { ComplianceDocument } from "#/db-schemas";
import type { VerificationStatus } from "#/utils/constants";
import { VERIFICATION_STATUS } from "#/utils/constants";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { assertTransitionAllowed } from "#/workflows/document/transition";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const SYSTEM_TRANSITION_TARGETS = new Set<VerificationStatus>([
  VERIFICATION_STATUS.EXPIRED,
  VERIFICATION_STATUS.OVERDUE,
]);

const updateDocumentStatus = Workflow.name("document.update-status").handler(
  async (
    input: {
      id: string;
      status: VerificationStatus;
      performedBy: string | null | undefined;
    },
    ctx,
  ): Promise<ComplianceDocument> => {
    const { id, status, performedBy } = input;
    if (!SYSTEM_TRANSITION_TARGETS.has(status)) {
      throw new Error(
        `document.update-status only supports expired/overdue transitions; use a dedicated workflow for "${status}"`,
      );
    }
    const current = await ctx.step.run(fetchDocumentStep, { id });
    if (current.verification_status === status) {
      return current;
    }

    assertTransitionAllowed(current.verification_status, status);

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updated_at: now, verification_status: status })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: status,
      actorId: performedBy ?? undefined,
      entityId: id,
      entityType: "compliance_document",
      previousState: { verification_status: current.verification_status },
    });

    return updated;
  },
);

export { updateDocumentStatus };
