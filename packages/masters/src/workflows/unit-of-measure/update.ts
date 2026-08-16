import { masterUnitOfMeasure } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { UpdateUnitOfMeasureSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertBaseUnitInvariantStep } from "#/workflow-steps/assert-base-unit-invariant";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateUnitOfMeasureSchema,
});

export const updateUnitOfMeasure = Workflow.name("masters.unit-of-measure.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchUnitOfMeasureStep, { id: input.id });

    const { code } = input.patch;
    if (code && code !== current.code) {
      await ctx.step.run("assert-code-unique", async () => {
        const [existing] = await ctx.db
          .select({ id: masterUnitOfMeasure.id })
          .from(masterUnitOfMeasure)
          .where(and(eq(masterUnitOfMeasure.code, code), ne(masterUnitOfMeasure.id, input.id)))
          .limit(1);

        if (existing) {
          throw new Error(`Unit of measure with code "${code}" already exists.`);
        }
      });
    }

    const restructures =
      input.patch.category !== undefined ||
      input.patch.isBaseUnit !== undefined ||
      input.patch.baseUnitId !== undefined ||
      input.patch.conversionFactor !== undefined;

    if (restructures) {
      await ctx.step.run(assertBaseUnitInvariantStep, {
        baseUnitId:
          input.patch.baseUnitId !== undefined ? input.patch.baseUnitId : current.baseUnitId,
        category: input.patch.category ?? current.category,
        conversionFactor:
          input.patch.conversionFactor !== undefined
            ? input.patch.conversionFactor
            : current.conversionFactor,
        excludeId: input.id,
        isBaseUnit: input.patch.isBaseUnit ?? current.isBaseUnit,
      });
    }

    const [updated] = await ctx.db
      .update(masterUnitOfMeasure)
      .set({
        baseUnitId:
          input.patch.baseUnitId !== undefined ? input.patch.baseUnitId : current.baseUnitId,
        category: input.patch.category,
        code: input.patch.code,
        conversionFactor:
          input.patch.conversionFactor !== undefined
            ? input.patch.conversionFactor
            : current.conversionFactor,
        decimalPlaces: input.patch.decimalPlaces,
        isActive: input.patch.isActive,
        isBaseUnit: input.patch.isBaseUnit,
        metadata: input.patch.metadata,
        name: input.patch.name,
        symbol: input.patch.symbol,
        updatedAt: new Date(),
      })
      .where(eq(masterUnitOfMeasure.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Unit of measure with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: input.patch,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
      });

      await ctx.pubsub.publish(UNIT_OF_MEASURE_EVENTS.UPDATED, {
        changes: input.patch,
        unitOfMeasure: { category: updated.category, code: updated.code, id: updated.id },
      });
    });

    return updated;
  });
