import { masterUnitOfMeasure, masterUomVersion } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { RetireUnitOfMeasureSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertNoReferencingUnitsStep } from "#/workflow-steps/assert-no-referencing-units";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RetireInputSchema = object({ input: RetireUnitOfMeasureSchema });

export const retireUnitOfMeasure = Workflow.name("masters.unit-of-measure.retire")
  .input(RetireInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RetireUnitOfMeasureSchema, input);
    const current = await ctx.step.run(fetchUnitOfMeasureStep, { id: parsed.id });

    if (current.status === "inactive") {
      throw new Error(`Unit "${current.code}" is already retired.`);
    }
    if (current.is_system) {
      throw new Error(
        `System unit "${current.code}" cannot be retired; deactivate it instead if it must hide from new entries.`,
      );
    }
    if (current.is_default) {
      throw new Error(
        `Unit "${current.code}" is the default for category "${current.category}"; set another default before retiring it.`,
      );
    }

    await ctx.step.run(assertNoReferencingUnitsStep, { id: parsed.id });

    const [updated] = await ctx.db
      .update(masterUnitOfMeasure)
      .set({ is_active: false, status: "inactive", updated_at: new Date() })
      .where(eq(masterUnitOfMeasure.id, parsed.id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to retire unit "${current.code}".`);
    }

    await ctx.step.run("close-versions", async () =>
      ctx.db
        .update(masterUomVersion)
        .set({ superseded_at: new Date() })
        .where(eq(masterUomVersion.uom_id, parsed.id)),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { reason: parsed.reason ?? null, status: "inactive" },
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
      });

      await ctx.pubsub.publish(UNIT_OF_MEASURE_EVENTS.RETIRED, {
        reason: parsed.reason ?? null,
        unitOfMeasure: { category: updated.category, code: updated.code, id: updated.id },
      });
    });

    return updated;
  });
