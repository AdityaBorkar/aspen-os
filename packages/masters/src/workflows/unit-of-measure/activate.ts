import { masterUnitOfMeasure } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const activateUnitOfMeasure = Workflow.name("masters.unit-of-measure.activate")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchUnitOfMeasureStep, { id: input.id });

    if (current.isActive) {
      return current;
    }

    const [updated] = await ctx.db
      .update(masterUnitOfMeasure)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(masterUnitOfMeasure.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Unit of measure with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ACTIVATED,
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
      });

      await ctx.pubsub.publish(UNIT_OF_MEASURE_EVENTS.ACTIVATED, {
        unitOfMeasureId: updated.id,
      });
    });

    return updated;
  });
