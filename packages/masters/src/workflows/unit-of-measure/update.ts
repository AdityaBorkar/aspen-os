import { masterUnitOfMeasure } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { UpdateUnitOfMeasureSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { assertBaseUnitInvariantStep } from "#/workflow-steps/assert-base-unit-invariant";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";
import { assertCodeUnique } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
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
      await ctx.step.run("assert-code-unique", () =>
        assertCodeUnique({
          code,
          db: ctx.db,
          excludeId: input.id,
          label: "Unit of measure",
          table: masterUnitOfMeasure,
        }),
      );
    }

    const touchesStructure =
      input.patch.category !== undefined ||
      input.patch.isBaseUnit !== undefined ||
      input.patch.baseUnitId !== undefined ||
      input.patch.conversionFactor !== undefined;

    const baseUnitId =
      input.patch.baseUnitId !== undefined ? input.patch.baseUnitId : current.baseUnitId;
    const conversionFactor =
      input.patch.conversionFactor !== undefined
        ? input.patch.conversionFactor
        : current.conversionFactor;

    if (touchesStructure) {
      await ctx.step.run(assertBaseUnitInvariantStep, {
        baseUnitId,
        category: input.patch.category ?? current.category,
        conversionFactor,
        excludeId: input.id,
        isBaseUnit: input.patch.isBaseUnit ?? current.isBaseUnit,
      });
    }

    const updates = stripUndefined({
      baseUnitId,
      category: input.patch.category,
      code: input.patch.code,
      conversionFactor,
      decimalPlaces: input.patch.decimalPlaces,
      isActive: input.patch.isActive,
      isBaseUnit: input.patch.isBaseUnit,
      metadata: input.patch.metadata,
      name: input.patch.name,
      symbol: input.patch.symbol,
    });

    const patchChanges = stripUndefined({ ...input.patch });

    const [updated] = await ctx.db
      .update(masterUnitOfMeasure)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(masterUnitOfMeasure.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Unit of measure with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: patchChanges,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
      });

      await ctx.pubsub.publish(UNIT_OF_MEASURE_EVENTS.UPDATED, {
        changes: patchChanges,
        unitOfMeasure: { category: updated.category, code: updated.code, id: updated.id },
      });
    });

    return updated;
  });
