import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { CreateComplianceDocumentSchema } from "#/types";
import { DEFAULT_REMINDER_DAYS } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateComplianceDocumentSchema });

const createDocument = Workflow.name("document.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const reminderDays = parsed.reminderDays ?? DEFAULT_REMINDER_DAYS;

    const [result] = await ctx.db
      .insert(complianceDocument)
      .values({
        assignedReviewer: parsed.assignedReviewer ?? null,
        assignedTo: parsed.assignedTo ?? null,
        attachment: parsed.attachment ?? null,
        autoRenewal: parsed.autoRenewal ?? false,
        branch: parsed.branch ?? null,
        category: parsed.category,
        connection: parsed.connection ?? null,
        createdBy: parsed.createdBy,
        documentType: parsed.documentType ?? null,
        dueDate: parsed.dueDate ? parsed.dueDate.toISOString().split("T")[0] : null,
        effectiveDate: parsed.effectiveDate
          ? parsed.effectiveDate.toISOString().split("T")[0]
          : null,
        escalationDays: parsed.escalationDays ?? null,
        expiryDate: parsed.expiryDate ? parsed.expiryDate.toISOString().split("T")[0] : null,
        issueDate: parsed.issueDate ? parsed.issueDate.toISOString().split("T")[0] : null,
        issuingAuthority: parsed.issuingAuthority ?? null,
        jurisdiction: parsed.jurisdiction ?? null,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        notes: parsed.notes ?? null,
        obligationId: parsed.obligationId ?? null,
        periodEnd: parsed.periodEnd ? parsed.periodEnd.toISOString().split("T")[0] : null,
        periodStart: parsed.periodStart ? parsed.periodStart.toISOString().split("T")[0] : null,
        referenceNumber: parsed.referenceNumber ?? null,
        reminderChannel: parsed.reminderChannel ?? "pubsub",
        reminderDays,
        renewalDate: parsed.renewalDate ? parsed.renewalDate.toISOString().split("T")[0] : null,
        renewalFrequency: parsed.renewalFrequency ?? null,
        sourceEntityId: parsed.sourceEntityId ?? null,
        sourceEntityType: parsed.sourceEntityType ?? null,
        sourceModule: parsed.sourceModule,
        verificationStatus: "draft",
      })
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
      newState: result as unknown as Record<string, unknown>,
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
