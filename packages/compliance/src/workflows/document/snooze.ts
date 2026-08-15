import { complianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const snoozeDocument = Workflow.name("document.snooze").handler(
  async (input: { id: string; days: number; snoozedBy: string }, ctx) => {
    const { id, days, snoozedBy } = input;
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + days);

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ snoozedUntil, updatedAt: new Date() })
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
