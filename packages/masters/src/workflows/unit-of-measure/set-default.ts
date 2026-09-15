import { masterUnitOfMeasure } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { SetDefaultUnitOfMeasureSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";
import { assignCategoryDefault } from "#/workflows/unit-of-measure/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, parse } from "valibot";

const SetDefaultInputSchema = object({ input: SetDefaultUnitOfMeasureSchema });

export const setDefaultUnitOfMeasure = Workflow.name("masters.unit-of-measure.set-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetDefaultUnitOfMeasureSchema, input);
    const current = await ctx.step.run(fetchUnitOfMeasureStep, { id: parsed.id });

    if (!current.is_active || current.status === "inactive") {
      throw new Error(
        `Only an active, published unit can become the default for category "${current.category}".`,
      );
    }
    if (current.status !== "published" && !current.is_base_unit) {
      throw new Error(
        `Unit "${current.code}" must be published before it becomes the category default.`,
      );
    }

    const [previous] = await ctx.step.run("fetch-previous-default", async () =>
      ctx.db
        .select({ id: masterUnitOfMeasure.id })
        .from(masterUnitOfMeasure)
        .where(
          and(
            eq(masterUnitOfMeasure.category, current.category),
            eq(masterUnitOfMeasure.is_default, true),
            ne(masterUnitOfMeasure.id, current.id),
          ),
        )
        .limit(1),
    );

    await ctx.step.run("assign-category-default", () =>
      assignCategoryDefault({ category: current.category, db: ctx.db, id: current.id }),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { isDefault: true, previousDefaultId: previous?.id ?? null },
        crudAction: "update",
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
      });

      await ctx.pubsub.publish(UNIT_OF_MEASURE_EVENTS.DEFAULT_SET, {
        previousDefaultId: previous?.id ?? null,
        unitOfMeasure: { category: current.category, code: current.code, id: current.id },
      });
    });

    return { id: current.id, previousDefaultId: previous?.id ?? null };
  });
