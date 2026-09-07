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
    assignedReviewer: parsed.assignedReviewer ?? null,
    assignedTo: parsed.assignedTo ?? null,
    attachment: parsed.attachment ?? null,
    autoRenewal: parsed.autoRenewal ?? false,
    branch: parsed.branch ?? null,
    category: parsed.category,
    connection: parsed.connection ?? null,
    createdBy: parsed.createdBy,
    documentType: parsed.documentType ?? null,
    dueDate: toDbDate(parsed.dueDate),
    effectiveDate: toDbDate(parsed.effectiveDate),
    escalationDays: parsed.escalationDays ?? null,
    expiryDate: toDbDate(parsed.expiryDate),
    issueDate: toDbDate(parsed.issueDate),
    issuingAuthority: parsed.issuingAuthority ?? null,
    jurisdiction: parsed.jurisdiction ?? null,
    metadata: parsed.metadata ?? null,
    name: parsed.name,
    notes: parsed.notes ?? null,
    obligationId: parsed.obligationId ?? null,
    periodEnd: toDbDate(parsed.periodEnd),
    periodStart: toDbDate(parsed.periodStart),
    referenceNumber: parsed.referenceNumber ?? null,
    reminderChannel: parsed.reminderChannel ?? "pubsub",
    reminderDays: parsed.reminderDays ?? [...DEFAULT_REMINDER_DAYS_EXPIRY],
    renewalDate: toDbDate(parsed.renewalDate),
    renewalFrequency: parsed.renewalFrequency ?? null,
    sourceEntityId: parsed.sourceEntityId ?? null,
    sourceEntityType: parsed.sourceEntityType ?? null,
    sourceModule: parsed.sourceModule,
    verificationStatus: VERIFICATION_STATUS.DRAFT,
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
      entityType: "compliance_document",
      newState: result,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_CREATED, {
      document: {
        category: result.category,
        id: result.id,
        name: result.name,
      },
    });

    return result;
  });

export { createDocument };
