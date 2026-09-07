import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { daysFromNow } from "#/utils/dates";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";
import { requireValidDays } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const snoozeDocument = Workflow.name("document.snooze").handler(
  async (input: { id: string; days: number; snoozedBy: string }, ctx) => {
    const { id, days, snoozedBy } = input;
    requireValidDays("days", days);
    await ctx.step.run(fetchDocumentStep, { id });

    const now = new Date();
    const snoozedUntil = daysFromNow(days, now);

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ snoozedUntil, updatedAt: now })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "snoozed",
      actorId: snoozedBy,
      entityId: id,
      entityType: "compliance_document",
      metadata: { snoozedUntil: snoozedUntil.toISOString() },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_SNOOZED, {
      documentId: id,
      snoozedBy,
      snoozedUntil: snoozedUntil.toISOString(),
    });

    return updated;
  },
);

export { snoozeDocument };
