import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../../db-schemas";
import { fetchDocumentStep } from "../../workflow-steps/fetch-document";

const assignDocumentTo = Workflow.name("document.assign-to").handler(
  async (input: { id: string; userId: string }, ctx) => {
    const { id, userId } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ assignedTo: userId, updatedAt: new Date() })
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
      metadata: { assigneeId: userId },
      previousState: { assignedTo: current.assignedTo },
    });

    return updated;
  },
);

export { assignDocumentTo };
