import { masterUomAlias, masterUnitOfMeasure } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { UpdateUnitOfMeasureSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { assertBaseUnitInvariantStep } from "#/workflow-steps/assert-base-unit-invariant";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";
import {
  assignCategoryDefault,
  assertUomSymbolUnique,
  recordUomVersion,
  todayDateString,
} from "#/workflows/unit-of-measure/shared";
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

    if (current.is_system) {
      const patch = input.patch;
      const structural: string[] = [];
      if (patch.category !== undefined) {
        structural.push("category");
      }
      if (patch.isBaseUnit !== undefined) {
        structural.push("isBaseUnit");
      }
      if (patch.baseUnitId !== undefined) {
        structural.push("baseUnitId");
      }
      if (patch.conversionFactor !== undefined) {
        structural.push("conversionFactor");
      }
      if (patch.code !== undefined) {
        structural.push("code");
      }
      if (patch.symbol !== undefined) {
        structural.push("symbol");
      }
      if (patch.isDefault !== undefined) {
        structural.push("isDefault");
      }
      if (structural.length > 0) {
        throw new Error(
          `System unit "${current.code}" is governed: only precision, active flag, name, and metadata are editable (blocked: ${structural.join(", ")}). Raise a versioned change with a reason for anything else.`,
        );
      }
    }

    const wantsRename =
      (input.patch.code !== undefined && input.patch.code !== current.code) ||
      (input.patch.symbol !== undefined && (input.patch.symbol ?? null) !== current.symbol);

    if (wantsRename && current.status === "published") {
      const oldCode = current.code;
      const [aliased] = await ctx.db
        .insert(masterUomAlias)
        .values({
          alias: oldCode,
          uom_id: current.id,
        })
        .onConflictDoNothing()
        .returning();
      if (aliased) {
        await ctx.step.run("audit-alias", async () => {
          await ctx.audit.write({
            action: AUDIT_ACTION.UPDATED,
            changes: { aliasAdded: oldCode },
            crudAction: "update",
            entityId: current.id,
            entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
          });
        });
      }
    }

    const nextCode = input.patch.code;
    if (nextCode && nextCode !== current.code) {
      await ctx.step.run("assert-code-unique", () =>
        assertCodeUnique({
          code: nextCode,
          db: ctx.db,
          excludeId: input.id,
          label: "Unit of measure",
          table: masterUnitOfMeasure,
        }),
      );
    }

    if (
      input.patch.symbol !== undefined ||
      input.patch.name !== undefined ||
      (input.patch.code !== undefined && input.patch.code !== current.code)
    ) {
      await ctx.step.run("assert-symbol-unique", () =>
        assertUomSymbolUnique({
          code: input.patch.code !== current.code ? input.patch.code : undefined,
          db: ctx.db,
          excludeId: input.id,
          name: input.patch.name !== current.name ? input.patch.name : undefined,
          symbol: input.patch.symbol ?? undefined,
        }),
      );
    }

    const touchesStructure =
      input.patch.category !== undefined ||
      input.patch.isBaseUnit !== undefined ||
      input.patch.baseUnitId !== undefined ||
      input.patch.conversionFactor !== undefined;

    const baseUnitId =
      input.patch.baseUnitId !== undefined ? input.patch.baseUnitId : current.base_unit_id;
    const conversionFactor =
      input.patch.conversionFactor !== undefined
        ? input.patch.conversionFactor
        : current.conversion_factor;

    if (touchesStructure) {
      await ctx.step.run(assertBaseUnitInvariantStep, {
        baseUnitId,
        category: input.patch.category ?? current.category,
        conversionFactor,
        excludeId: input.id,
        isBaseUnit: input.patch.isBaseUnit ?? current.is_base_unit,
      });
    }

    const factorChanged =
      (input.patch.conversionFactor !== undefined &&
        input.patch.conversionFactor !== current.conversion_factor) ||
      (input.patch.decimalPlaces !== undefined &&
        input.patch.decimalPlaces !== current.decimal_places);

    if (factorChanged && !input.patch.factorChangeReason) {
      throw new Error(
        "Factor or precision changes need a reason; historical postings keep the factor-at-time and never restate.",
      );
    }

    const nextIsActive = input.patch.isActive ?? current.is_active;
    if (current.is_default && !nextIsActive) {
      throw new Error(
        `Unit "${current.code}" is the default for category "${current.category}"; set another default before deactivating it.`,
      );
    }

    const updates = stripUndefined({
      base_unit_id: baseUnitId ?? null,
      category: input.patch.category,
      code: input.patch.code,
      conversion_factor: conversionFactor,
      decimal_places: input.patch.decimalPlaces,
      is_active: input.patch.isActive,
      is_base_unit: input.patch.isBaseUnit,
      is_indivisible: input.patch.isIndivisible,
      metadata: input.patch.metadata ?? undefined,
      name: input.patch.name,
      symbol: input.patch.symbol ?? undefined,
    });

    const patchChanges = stripUndefined(input.patch);

    const [updated] = await ctx.db
      .update(masterUnitOfMeasure)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(masterUnitOfMeasure.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Unit of measure with id "${input.id}" not found.`);
    }

    if (factorChanged) {
      await ctx.step.run("record-version", () =>
        recordUomVersion({
          conversionFactor: updated.conversion_factor,
          db: ctx.db,
          decimalPlaces: updated.decimal_places,
          effectiveFrom: todayDateString(),
          reason: input.patch.factorChangeReason ?? null,
          uomId: updated.id,
        }),
      );
    }

    if (input.patch.isDefault === true && !updated.is_default) {
      if (!updated.is_active) {
        throw new Error("Only an active unit can become the category default.");
      }
      await ctx.step.run("assign-category-default", () =>
        assignCategoryDefault({ category: updated.category, db: ctx.db, id: updated.id }),
      );
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
