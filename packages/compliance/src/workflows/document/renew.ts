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

    assertTransitionAllowed(current.verificationStatus, VERIFICATION_STATUS.RENEWED);

    const now = new Date();
    await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: now, verificationStatus: VERIFICATION_STATUS.RENEWED })
      .where(eq(complianceDocument.id, id));

    const reminderDays = newData.reminderDays ??
      current.reminderDays ?? [...DEFAULT_REMINDER_DAYS_EXPIRY];
    const escalationDays = newData.escalationDays ?? current.escalationDays;

    const [newDoc] = await ctx.db
      .insert(complianceDocument)
      .values({
        assignedReviewer: newData.assignedReviewer ?? current.assignedReviewer,
        assignedTo: newData.assignedTo ?? current.assignedTo,
        attachment: newData.attachment ?? current.attachment,
        autoRenewal: newData.autoRenewal ?? current.autoRenewal,
        branch: newData.branch ?? current.branch,
        category: newData.category ?? current.category,
        connection: newData.connection ?? current.connection,
        createdBy: newData.createdBy ?? current.createdBy,
        documentType: newData.documentType ?? current.documentType,
        dueDate: resolveDate(newData.dueDate, current.dueDate),
        escalationDays,
        expiryDate: resolveDate(newData.expiryDate, current.expiryDate),
        issueDate: resolveDate(newData.issueDate, current.issueDate),
        issuingAuthority: newData.issuingAuthority ?? current.issuingAuthority,
        jurisdiction: newData.jurisdiction ?? current.jurisdiction,
        metadata: newData.metadata ?? current.metadata,
        name: newData.name ?? current.name,
        notes: newData.notes ?? current.notes,
        obligationId: current.obligationId,
        periodEnd: resolveDate(newData.periodEnd, current.periodEnd),
        periodStart: resolveDate(newData.periodStart, current.periodStart),
        referenceNumber: newData.referenceNumber ?? null,
        reminderDays,
        renewalDate: resolveDate(newData.renewalDate, current.renewalDate),
        renewalFrequency: newData.renewalFrequency ?? current.renewalFrequency,
        renewedFrom: id,
        sourceEntityId: current.sourceEntityId,
        sourceEntityType: current.sourceEntityType,
        sourceModule: current.sourceModule,
        verificationStatus: VERIFICATION_STATUS.DRAFT,
      })
      .returning();

    if (!newDoc) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "renewed",
      actorId: current.createdBy,
      entityId: newDoc.id,
      entityType: "compliance_document",
      metadata: { newDocumentId: newDoc.id, oldDocumentId: id },
      previousState: { id, verificationStatus: current.verificationStatus },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_RENEWED, {
      newDocumentId: newDoc.id,
      oldDocumentId: id,
    });

    return { newDocument: newDoc, oldDocument: current };
  },
);

export { renewDocument };
