import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import type { ComplianceDocument } from "../db-schemas";
import { complianceDocument } from "../db-schemas";
import type { AuditAction, VerificationStatus } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

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
    const current = await ctx.step.run(fetchDocumentStep, { id });

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: status })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    const action: AuditAction =
      status === "expired"
        ? "expired"
        : status === "overdue"
          ? "overdue"
          : "updated";

    await ctx.audit.write({
      action,
      actorId: performedBy ?? undefined,
      entityId: id,
      entityType: "compliance_document",
      previousState: { verificationStatus: current.verificationStatus },
    });

    return updated;
  },
);

export { updateDocumentStatus };
