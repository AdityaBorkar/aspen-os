import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { CreateComplianceDocumentSchema } from "#/schemas";
import type { CreateComplianceDocumentInput } from "#/schemas";
import { DEFAULT_REMINDER_DAYS_EXPIRY, VERIFICATION_STATUS } from "#/utils/constants";
import { toDbDate } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateComplianceDocumentSchema });

export function toDocumentInsertRow(
  parsed: CreateComplianceDocumentInput,
): typeof complianceDocument.$inferInsert {
  return {
    assigned_reviewer: parsed.assignedReviewer ?? null,
    assigned_to: parsed.assignedTo ?? null,
    attachment: parsed.attachment ?? null,
    auto_renewal: parsed.autoRenewal ?? false,
    branch: parsed.branch ?? null,
    category: parsed.category,
    connection: parsed.connection ?? null,
    created_by: parsed.createdBy,
    document_type: parsed.documentType ?? null,
    due_date: toDbDate(parsed.dueDate),
    effective_date: toDbDate(parsed.effectiveDate),
    escalation_days: parsed.escalationDays ?? null,
    expiry_date: toDbDate(parsed.expiryDate),
    issue_date: toDbDate(parsed.issueDate),
    issuing_authority: parsed.issuingAuthority ?? null,
    jurisdiction: parsed.jurisdiction ?? null,
    metadata: parsed.metadata ?? null,
    name: parsed.name,
    notes: parsed.notes ?? null,
    obligation_id: parsed.obligationId ?? null,
    period_end: toDbDate(parsed.periodEnd),
    period_start: toDbDate(parsed.periodStart),
    reference_number: parsed.referenceNumber ?? null,
    reminder_channel: parsed.reminderChannel ?? "pubsub",
    reminder_days: parsed.reminderDays ?? [...DEFAULT_REMINDER_DAYS_EXPIRY],
    renewal_date: toDbDate(parsed.renewalDate),
    renewal_frequency: parsed.renewalFrequency ?? null,
    source_entity_id: parsed.sourceEntityId ?? null,
    source_entity_type: parsed.sourceEntityType ?? null,
    source_module: parsed.sourceModule,
    verification_status: VERIFICATION_STATUS.DRAFT,
  };
}

const createDocument = Workflow.name("document.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(complianceDocument)
      .values(toDocumentInsertRow(input))
      .returning();

    if (!result) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "created",
      actorId: input.createdBy,
      crudAction: "create",
      entityId: result.id,
      entityType: "document",
      newState: result,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_CREATED, {
      document: {
        category: result.category,
        id: result.id,
        name: result.name,
      },
    });

    // Fact for calendar reminder bridge — single dispatch path via calendar_reminder.
    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRING, {
      assignedTo: result.assigned_to,
      createdBy: result.created_by,
      documentId: result.id,
      dueDate: result.due_date,
      expiryDate: result.expiry_date,
      reminderDays: result.reminder_days,
      snoozedUntil: result.snoozed_until ? result.snoozed_until.toISOString() : null,
      verificationStatus: result.verification_status,
    });

    return result;
  });

export { createDocument };
