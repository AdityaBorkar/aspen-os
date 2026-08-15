import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { UpdateComplianceDocumentSchema } from "#/types";
import type { UpdateComplianceDocumentInput } from "#/types";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { parse } from "valibot";

const updateDocument = Workflow.name("document.update").handler(
  async (input: { id: string; patch: UpdateComplianceDocumentInput }, ctx) => {
    const { id, patch } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });
    const parsed = parse(UpdateComplianceDocumentSchema, patch);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.name !== undefined) {
      updateData.name = parsed.name;
    }
    if (parsed.category !== undefined) {
      updateData.category = parsed.category;
    }
    if (parsed.documentType !== undefined) {
      updateData.documentType = parsed.documentType;
    }
    if (parsed.referenceNumber !== undefined) {
      updateData.referenceNumber = parsed.referenceNumber;
    }
    if (parsed.issuingAuthority !== undefined) {
      updateData.issuingAuthority = parsed.issuingAuthority;
    }
    if (parsed.jurisdiction !== undefined) {
      updateData.jurisdiction = parsed.jurisdiction;
    }
    if (parsed.issueDate !== undefined) {
      updateData.issueDate = parsed.issueDate ? parsed.issueDate.toISOString().split("T")[0] : null;
    }
    if (parsed.expiryDate !== undefined) {
      updateData.expiryDate = parsed.expiryDate
        ? parsed.expiryDate.toISOString().split("T")[0]
        : null;
    }
    if (parsed.dueDate !== undefined) {
      updateData.dueDate = parsed.dueDate ? parsed.dueDate.toISOString().split("T")[0] : null;
    }
    if (parsed.effectiveDate !== undefined) {
      updateData.effectiveDate = parsed.effectiveDate
        ? parsed.effectiveDate.toISOString().split("T")[0]
        : null;
    }
    if (parsed.periodStart !== undefined) {
      updateData.periodStart = parsed.periodStart
        ? parsed.periodStart.toISOString().split("T")[0]
        : null;
    }
    if (parsed.periodEnd !== undefined) {
      updateData.periodEnd = parsed.periodEnd ? parsed.periodEnd.toISOString().split("T")[0] : null;
    }
    if (parsed.renewalDate !== undefined) {
      updateData.renewalDate = parsed.renewalDate
        ? parsed.renewalDate.toISOString().split("T")[0]
        : null;
    }
    if (parsed.renewalFrequency !== undefined) {
      updateData.renewalFrequency = parsed.renewalFrequency;
    }
    if (parsed.autoRenewal !== undefined) {
      updateData.autoRenewal = parsed.autoRenewal;
    }
    if (parsed.reminderDays !== undefined) {
      updateData.reminderDays = parsed.reminderDays;
    }
    if (parsed.escalationDays !== undefined) {
      updateData.escalationDays = parsed.escalationDays;
    }
    if (parsed.branch !== undefined) {
      updateData.branch = parsed.branch;
    }
    if (parsed.connection !== undefined) {
      updateData.connection = parsed.connection;
    }
    if (parsed.attachment !== undefined) {
      updateData.attachment = parsed.attachment;
    }
    if (parsed.notes !== undefined) {
      updateData.notes = parsed.notes;
    }
    if (parsed.metadata !== undefined) {
      updateData.metadata = parsed.metadata;
    }
    if (parsed.assignedReviewer !== undefined) {
      updateData.assignedReviewer = parsed.assignedReviewer;
    }
    if (parsed.assignedTo !== undefined) {
      updateData.assignedTo = parsed.assignedTo;
    }
    if (parsed.reminderChannel !== undefined) {
      updateData.reminderChannel = parsed.reminderChannel;
    }
    if (parsed.verificationStatus !== undefined) {
      updateData.verificationStatus = parsed.verificationStatus;
    }

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set(updateData)
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    const changes: Record<string, { new: unknown; old: unknown }> = {};
    const oldRecord = current as unknown as Record<string, unknown>;
    const newRecord = updated as unknown as Record<string, unknown>;
    for (const key of Object.keys(updateData)) {
      if (key === "updatedAt") {
        continue;
      }
      const oldVal = oldRecord[key];
      const newVal = newRecord[key];
      if (oldVal !== newVal) {
        changes[key] = { new: newVal, old: oldVal };
      }
    }

    await ctx.audit.write({
      action: "updated",
      actorId: current.createdBy,
      changes,
      crudAction: "update",
      entityId: id,
      entityType: "compliance_document",
      newState: updated as unknown as Record<string, unknown>,
      previousState: current as unknown as Record<string, unknown>,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_UPDATED, {
      changes,
      document: { id: updated.id, name: updated.name },
    });

    return updated;
  },
);

export { updateDocument };
