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

    for (const [key, value] of Object.entries(parsed)) {
      if (value === undefined) {
        continue;
      }
      if (DATE_KEYS.has(key)) {
        // SAFETY: DATE_KEYS only contains date columns, so narrowed values are Date instances or null.
        Object.assign(updateData, {
          [key]: toDbDate(value as Date | null | undefined),
        });
      } else {
        Object.assign(updateData, { [key]: value });
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

    return updated;
  },
);

export { updateDocument };
