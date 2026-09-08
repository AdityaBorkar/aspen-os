import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import type { CreateComplianceDocumentInput } from "#/schemas";
import { VERIFICATION_STATUS, DEFAULT_REMINDER_DAYS_EXPIRY } from "#/utils/constants";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { toDbDate } from "#/workflows/document/shared";
import { assertTransitionAllowed } from "#/workflows/document/transition";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

function resolveDate(override: Date | undefined, fallback: string | null): string | null {
  if (override) {
    return toDbDate(override);
  }
  return fallback;
}

const renewDocument = Workflow.name("document.renew").handler(
  async (input: { id: string; newData: Partial<CreateComplianceDocumentInput> }, ctx) => {
    const { id, newData } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    assertTransitionAllowed(current.verification_status, VERIFICATION_STATUS.RENEWED);

    const now = new Date();
    await ctx.db
      .update(complianceDocument)
      .set({ updated_at: now, verification_status: VERIFICATION_STATUS.RENEWED })
      .where(eq(complianceDocument.id, id));

    const reminderDays = newData.reminderDays ??
      current.reminder_days ?? [...DEFAULT_REMINDER_DAYS_EXPIRY];
    const escalationDays = newData.escalationDays ?? current.escalation_days;

    const [newDoc] = await ctx.db
      .insert(complianceDocument)
      .values({
        assigned_reviewer: newData.assignedReviewer ?? current.assigned_reviewer,
        assigned_to: newData.assignedTo ?? current.assigned_to,
        attachment: newData.attachment ?? current.attachment,
        auto_renewal: newData.autoRenewal ?? current.auto_renewal,
        branch: newData.branch ?? current.branch,
        category: newData.category ?? current.category,
        connection: newData.connection ?? current.connection,
        created_by: newData.createdBy ?? current.created_by,
        document_type: newData.documentType ?? current.document_type,
        due_date: resolveDate(newData.dueDate, current.due_date),
        escalation_days: escalationDays,
        expiry_date: resolveDate(newData.expiryDate, current.expiry_date),
        issue_date: resolveDate(newData.issueDate, current.issue_date),
        issuing_authority: newData.issuingAuthority ?? current.issuing_authority,
        jurisdiction: newData.jurisdiction ?? current.jurisdiction,
        metadata: newData.metadata ?? current.metadata,
        name: newData.name ?? current.name,
        notes: newData.notes ?? current.notes,
        obligation_id: current.obligation_id,
        period_end: resolveDate(newData.periodEnd, current.period_end),
        period_start: resolveDate(newData.periodStart, current.period_start),
        reference_number: newData.referenceNumber ?? null,
        reminder_days: reminderDays,
        renewal_date: resolveDate(newData.renewalDate, current.renewal_date),
        renewal_frequency: newData.renewalFrequency ?? current.renewal_frequency,
        renewed_from: id,
        source_entity_id: current.source_entity_id,
        source_entity_type: current.source_entity_type,
        source_module: current.source_module,
        verification_status: VERIFICATION_STATUS.DRAFT,
      })
      .returning();

    if (!newDoc) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "renewed",
      actorId: current.created_by,
      entityId: newDoc.id,
      entityType: "document",
      metadata: { newDocumentId: newDoc.id, oldDocumentId: id },
      previousState: { id, verification_status: current.verification_status },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_RENEWED, {
      newDocumentId: newDoc.id,
      oldDocumentId: id,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ARCHIVED, {
      documentId: id,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRING, {
      assignedTo: newDoc.assigned_to,
      createdBy: newDoc.created_by,
      documentId: newDoc.id,
      dueDate: newDoc.due_date,
      expiryDate: newDoc.expiry_date,
      reminderDays: newDoc.reminder_days,
      snoozedUntil: newDoc.snoozed_until ? newDoc.snoozed_until.toISOString() : null,
      verificationStatus: newDoc.verification_status,
    });

    return { newDocument: newDoc, oldDocument: current };
  },
);

export { renewDocument };
