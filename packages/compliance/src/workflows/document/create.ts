import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { CreateComplianceDocumentSchema } from "#/schemas";
import { DEFAULT_REMINDER_DAYS_EXPIRY, VERIFICATION_STATUS } from "#/utils/constants";
import { toDbDate } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateComplianceDocumentSchema });

export function toDocumentInsertRow(parsed: {
  assignedReviewer?: string | null;
  assignedTo?: string | null;
  attachment?: string | null;
  autoRenewal?: boolean;
  branch?: string | null;
  category: (typeof complianceDocument.$inferInsert)["category"];
  connection?: string | null;
  createdBy: string;
  documentType?: string | null;
  dueDate?: Date | null;
  effectiveDate?: Date | null;
  escalationDays?: number[] | null;
  expiryDate?: Date | null;
  issueDate?: Date | null;
  issuingAuthority?: string | null;
  jurisdiction?: string | null;
  metadata?: (typeof complianceDocument.$inferInsert)["metadata"];
  name: string;
  notes?: string | null;
  obligationId?: string | null;
  periodEnd?: Date | null;
  periodStart?: Date | null;
  referenceNumber?: string | null;
  reminderChannel?: (typeof complianceDocument.$inferInsert)["reminderChannel"];
  reminderDays?: number[] | null;
  renewalDate?: Date | null;
  renewalFrequency?: (typeof complianceDocument.$inferInsert)["renewalFrequency"];
  sourceEntityId?: string | null;
  sourceEntityType?: string | null;
  sourceModule: string;
}): typeof complianceDocument.$inferInsert {
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
    const parsed = input;

    const [result] = await ctx.db
      .insert(complianceDocument)
      .values(toDocumentInsertRow(parsed))
      .returning();

    if (!result) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "created",
      actorId: parsed.createdBy,
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
