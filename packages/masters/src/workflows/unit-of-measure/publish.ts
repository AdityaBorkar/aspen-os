import { masterUnitOfMeasure } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";

export const publishUnitOfMeasure = Workflow.name("masters.unit-of-measure.publish")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchUnitOfMeasureStep, { id: input.id });

    if (current.status === "published") {
      throw new Error(`Unit "${current.code}" is already published.`);
    }
    if (current.status === "inactive") {
      throw new Error(
        `Unit "${current.code}" is retired; create a new code instead of republishing.`,
      );
    }

    const blockers: string[] = [];
    if (!current.symbol) {
      blockers.push("symbol is missing");
    }
    if (!current.is_active) {
      blockers.push("unit is deactivated");
    }
    if (!current.is_base_unit) {
      const [base] = await ctx.step.run("check-category-base", async () =>
        ctx.db
          .select({ id: masterUnitOfMeasure.id })
          .from(masterUnitOfMeasure)
          .where(
            and(
              eq(masterUnitOfMeasure.category, current.category),
              eq(masterUnitOfMeasure.is_base_unit, true),
              ne(masterUnitOfMeasure.id, current.id),
            ),
          )
          .limit(1),
      );
      if (!base) {
        blockers.push(`category "${current.category}" has no base unit`);
      }
      if (!current.base_unit_id) {
        blockers.push("derived unit has no base-unit reference");
      }
      if (current.conversion_factor === null || current.conversion_factor === undefined) {
        blockers.push("derived unit has no conversion factor");
      }
    }
    if (blockers.length > 0) {
      throw new Error(`Cannot publish "${current.code}": ${blockers.join("; ")}.`);
    }

    const [updated] = await ctx.db
      .update(masterUnitOfMeasure)
      .set({ is_active: true, status: "published", updated_at: new Date() })
      .where(eq(masterUnitOfMeasure.id, current.id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to publish unit "${current.code}".`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { status: "published" },
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
      });

      await ctx.pubsub.publish(UNIT_OF_MEASURE_EVENTS.UPDATED, {
        changes: { status: "published" },
        unitOfMeasure: { category: updated.category, code: updated.code, id: updated.id },
      });
    });

    return updated;
  });
