import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
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

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRING, {
      assignedTo: updated.assigned_to,
      createdBy: updated.created_by,
      documentId: updated.id,
      dueDate: updated.due_date,
      expiryDate: updated.expiry_date,
      reminderDays: updated.reminder_days,
      snoozedUntil: updated.snoozed_until ? updated.snoozed_until.toISOString() : null,
      verificationStatus: updated.verification_status,
    });

    return updated;
  },
);

export { assignDocumentTo };
