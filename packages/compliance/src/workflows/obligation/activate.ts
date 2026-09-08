import { complianceObligation } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { fetchObligationStep } from "#/workflow-steps/fetch-obligation";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const activateObligation = Workflow.name("obligation.activate").handler(
  async (input: { id: string; performedBy?: string }, ctx) => {
    const current = await ctx.step.run(fetchObligationStep, { id: input.id });
    const [updated] = await ctx.db
      .update(complianceObligation)
      .set({ is_active: true, updated_at: new Date() })
      .where(eq(complianceObligation.id, input.id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "obligation_activated",
      actorId: input.performedBy ?? ctx.actorId ?? current.created_by,
      crudAction: "update",
      entityId: input.id,
      entityType: "obligation",
      newState: updated,
      previousState: current,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.OBLIGATION_ACTIVATED, {
      obligationId: input.id,
    });

    return updated;
  },
);

export { activateObligation };
