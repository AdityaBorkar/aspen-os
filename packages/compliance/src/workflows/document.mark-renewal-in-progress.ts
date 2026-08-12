import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";
import { fetchDocumentStep } from "./steps/fetch-document";

const markRenewalInProgress = Workflow.name(
  "document.mark-renewal-in-progress",
).handler(async (input: { id: string }, ctx) => {
  const { id } = input;
  const current = await ctx.step.run(fetchDocumentStep, { id });

  const [updated] = await ctx.db
    .update(complianceDocument)
    .set({ updatedAt: new Date(), verificationStatus: "submitted" })
    .where(eq(complianceDocument.id, id))
    .returning();

  if (!updated) throw new Error("Database operation returned no result");

  await ctx.audit.write({
    action: "updated",
    actorId: current.createdBy,
    entityId: id,
    entityType: "compliance_document",
    metadata: { note: "Renewal in progress" },
    previousState: { verificationStatus: current.verificationStatus },
  });

  return updated;
});

export { markRenewalInProgress };
