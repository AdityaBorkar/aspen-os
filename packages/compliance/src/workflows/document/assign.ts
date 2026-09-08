import { complianceDocument } from "#/db-schemas";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const assignDocumentTo = Workflow.name("document.assign-to").handler(
  async (input: { id: string; userId: string }, ctx) => {
    const { id, userId } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ assigned_to: userId, updated_at: new Date() })
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
      metadata: { assigneeId: userId },
      previousState: { assigned_to: current.assigned_to },
    });

    return updated;
  },
);

export { assignDocumentTo };
