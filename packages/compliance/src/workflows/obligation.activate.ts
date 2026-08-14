import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceObligation } from "../db-schemas";
import { COMPLIANCE_EVENTS } from "../pubsub";

const activateObligation = Workflow.name("obligation.activate").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(complianceObligation)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(complianceObligation.id, input.id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "obligation_activated",
      entityId: input.id,
      entityType: "compliance_obligation",
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.OBLIGATION_ACTIVATED, {
      obligationId: input.id,
    });

    return updated;
  },
);

export { activateObligation };
