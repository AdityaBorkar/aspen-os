import { complianceDocument } from "#/db-schemas";
import type { NewComplianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { UpdateComplianceDocumentSchema } from "#/schemas";
import type { UpdateComplianceDocumentInput } from "#/schemas";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { diffRecords, toDbDate } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { parse } from "valibot";

const DATE_KEYS = new Set([
  "dueDate",
  "effectiveDate",
  "expiryDate",
  "issueDate",
  "periodEnd",
  "periodStart",
  "renewalDate",
]);

const updateDocument = Workflow.name("document.update").handler(
  async (input: { id: string; patch: UpdateComplianceDocumentInput }, ctx) => {
    const { id, patch } = input;
    if ("verificationStatus" in patch) {
      throw new Error(
        "verificationStatus cannot be updated via document.update; use a status workflow",
      );
    }
    const current = await ctx.step.run(fetchDocumentStep, { id });
    const parsed = parse(UpdateComplianceDocumentSchema, patch);

    const updateData: Partial<NewComplianceDocument> = { updated_at: new Date() };

    const CAMEL_TO_SNAKE = {
      assignedReviewer: "assigned_reviewer",
      assignedTo: "assigned_to",
      autoRenewal: "auto_renewal",
      documentType: "document_type",
      escalationDays: "escalation_days",
      expiryPolicyChannel: "expiry_policy_channel",
      expiryPolicyDays: "expiry_policy_days",
      issuingAuthority: "issuing_authority",
      referenceNumber: "reference_number",
      reminderChannel: "expiry_policy_channel",
      reminderDays: "expiry_policy_days",
      renewalFrequency: "renewal_frequency",
    } satisfies Record<string, string>;

    for (const [key, value] of Object.entries(parsed)) {
      if (value === undefined) {
        continue;
      }
      // SAFETY: key is checked via `in` guard, so narrowed keyof assertion is safe.
      const dbKey =
        key in CAMEL_TO_SNAKE ? CAMEL_TO_SNAKE[key as keyof typeof CAMEL_TO_SNAKE] : key;
      if (DATE_KEYS.has(key)) {
        // SAFETY: DATE_KEYS only contains date columns, so narrowed values are Date instances or null.
        Object.assign(updateData, {
          [dbKey]: toDbDate(value as Date | null | undefined),
        });
      } else {
        Object.assign(updateData, { [dbKey]: value });
      }
    }

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set(updateData)
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    const changes = diffRecords(current, updated, Object.keys(updateData));

    await ctx.audit.write({
      action: "updated",
      actorId: current.created_by,
      changes,
      crudAction: "update",
      entityId: id,
      entityType: "document",
      newState: updated,
      previousState: current,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_UPDATED, {
      changes,
      document: { id: updated.id, name: updated.name },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRING, {
      assignedTo: updated.assigned_to,
      createdBy: updated.created_by,
      documentId: updated.id,
      dueDate: updated.due_date,
      expiryDate: updated.expiry_date,
      expiryPolicyDays: updated.expiry_policy_days,
      reminderDays: updated.expiry_policy_days,
      snoozedUntil: updated.snoozed_until ? updated.snoozed_until.toISOString() : null,
      verificationStatus: updated.verification_status,
    });

    return updated;
  },
);

export { updateDocument };
