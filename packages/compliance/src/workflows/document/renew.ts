import { complianceDocument } from "#/db-schemas";
import type { ComplianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import type { CreateComplianceDocumentInput } from "#/types";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { DEFAULT_REMINDER_DAYS } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const renewDocument = Workflow.name("document.renew").handler(
  async (input: { id: string; newData: Partial<CreateComplianceDocumentInput> }, ctx) => {
    const { id, newData } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: "renewed" })
      .where(eq(complianceDocument.id, id));

    const reminderDays =
      newData.reminderDays ?? (current.reminderDays as number[] | null) ?? DEFAULT_REMINDER_DAYS;
    const escalationDays = newData.escalationDays ?? (current.escalationDays as number[] | null);

    const [newDoc] = await ctx.db
      .insert(complianceDocument)
      .values({
        assignedReviewer: newData.assignedReviewer ?? current.assignedReviewer,
        assignedTo: newData.assignedTo ?? current.assignedTo,
        attachment: newData.attachment ?? current.attachment,
        autoRenewal: newData.autoRenewal ?? current.autoRenewal,
        branch: newData.branch ?? current.branch,
        category: (newData.category ?? current.category) as ComplianceDocument["category"],
        connection: newData.connection ?? current.connection,
        createdBy: newData.createdBy ?? current.createdBy,
        documentType: newData.documentType ?? current.documentType,
        dueDate: newData.dueDate ? newData.dueDate.toISOString().split("T")[0] : null,
        escalationDays,
        expiryDate: newData.expiryDate ? newData.expiryDate.toISOString().split("T")[0] : null,
        issueDate: newData.issueDate ? newData.issueDate.toISOString().split("T")[0] : null,
        issuingAuthority: newData.issuingAuthority ?? current.issuingAuthority,
        jurisdiction: newData.jurisdiction ?? current.jurisdiction,
        metadata: newData.metadata ?? current.metadata,
        name: newData.name ?? current.name,
        notes: newData.notes ?? current.notes,
        obligationId: current.obligationId,
        periodEnd: newData.periodEnd ? newData.periodEnd.toISOString().split("T")[0] : null,
        periodStart: newData.periodStart ? newData.periodStart.toISOString().split("T")[0] : null,
        referenceNumber: newData.referenceNumber ?? null,
        reminderDays,
        renewalDate: newData.renewalDate ? newData.renewalDate.toISOString().split("T")[0] : null,
        renewalFrequency: newData.renewalFrequency ?? current.renewalFrequency,
        renewedFrom: id,
        sourceEntityId: current.sourceEntityId,
        sourceEntityType: current.sourceEntityType,
        sourceModule: current.sourceModule,
        verificationStatus: "draft",
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
