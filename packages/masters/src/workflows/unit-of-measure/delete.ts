import { masterUnitOfMeasure } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertNoReferencingUnitsStep } from "#/workflow-steps/assert-no-referencing-units";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deleteUnitOfMeasure = Workflow.name("masters.unit-of-measure.delete")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchUnitOfMeasureStep, { id: input.id });

    await ctx.step.run(assertNoReferencingUnitsStep, { id: input.id });

    await ctx.db.delete(masterUnitOfMeasure).where(eq(masterUnitOfMeasure.id, input.id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
        metadata: { category: current.category, code: current.code },
      });

      await ctx.pubsub.publish(UNIT_OF_MEASURE_EVENTS.REMOVED, {
        unitOfMeasure: { category: current.category, code: current.code, id: current.id },
      });
    });

    return { removed: true };
  });
