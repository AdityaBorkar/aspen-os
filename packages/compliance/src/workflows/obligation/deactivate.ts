import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceObligation } from "../../db-schemas";
import { COMPLIANCE_EVENTS } from "../../pubsub";

const deactivateObligation = Workflow.name("obligation.deactivate").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(complianceObligation)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(complianceObligation.id, input.id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "obligation_deactivated",
      entityId: input.id,
      entityType: "compliance_obligation",
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.OBLIGATION_DEACTIVATED, {
      obligationId: input.id,
    });

    return updated;
  },
);

export { deactivateObligation };
