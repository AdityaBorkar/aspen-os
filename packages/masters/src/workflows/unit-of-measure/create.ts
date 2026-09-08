import { masterUnitOfMeasure } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { CreateUnitOfMeasureSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertBaseUnitInvariantStep } from "#/workflow-steps/assert-base-unit-invariant";
import { assertCodeUnique } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateUnitOfMeasureSchema });

export const createUnitOfMeasure = Workflow.name("masters.unit-of-measure.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateUnitOfMeasureSchema, input);

    await ctx.step.run("assert-code-unique", () =>
      assertCodeUnique({
        code: parsed.code,
        db: ctx.db,
        label: "Unit of measure",
        table: masterUnitOfMeasure,
      }),
    );

    await ctx.step.run(assertBaseUnitInvariantStep, {
      baseUnitId: parsed.baseUnitId ?? null,
      category: parsed.category,
      conversionFactor: parsed.conversionFactor ?? null,
      isBaseUnit: parsed.isBaseUnit,
    });

    const [unit] = await ctx.db
      .insert(masterUnitOfMeasure)
      .values({
        base_unit_id: parsed.isBaseUnit ? null : (parsed.baseUnitId ?? null),
        category: parsed.category,
        code: parsed.code,
        conversion_factor: parsed.isBaseUnit ? null : (parsed.conversionFactor ?? null),
        decimal_places: parsed.decimalPlaces,
        is_active: parsed.isActive,
        is_base_unit: parsed.isBaseUnit,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        symbol: parsed.symbol ?? null,
      })
      .returning();

    if (!unit) {
      throw new Error("Failed to create unit of measure.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: unit.id,
        entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
        newState: { category: unit.category, code: unit.code, name: unit.name },
      });

      await ctx.pubsub.publish(UNIT_OF_MEASURE_EVENTS.CREATED, {
        unitOfMeasure: { category: unit.category, code: unit.code, id: unit.id },
      });
    });

    return unit;
  });
