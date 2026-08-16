import { masterUnitOfMeasure } from "#/db-schemas";
import { UNIT_OF_MEASURE_EVENTS } from "#/pubsub";
import { CreateUnitOfMeasureSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertBaseUnitInvariantStep } from "#/workflow-steps/assert-base-unit-invariant";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateUnitOfMeasureSchema });

export const createUnitOfMeasure = Workflow.name("masters.unit-of-measure.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateUnitOfMeasureSchema, input);

    await ctx.step.run("assert-code-unique", async () => {
      const [existing] = await ctx.db
        .select({ id: masterUnitOfMeasure.id })
        .from(masterUnitOfMeasure)
        .where(eq(masterUnitOfMeasure.code, parsed.code))
        .limit(1);

      if (existing) {
        throw new Error(`Unit of measure with code "${parsed.code}" already exists.`);
      }
    });

    await ctx.step.run(assertBaseUnitInvariantStep, {
      baseUnitId: parsed.baseUnitId ?? null,
      category: parsed.category,
      conversionFactor: parsed.conversionFactor ?? null,
      isBaseUnit: parsed.isBaseUnit,
    });

    const [unit] = await ctx.db
      .insert(masterUnitOfMeasure)
      .values({
        baseUnitId: parsed.isBaseUnit ? null : (parsed.baseUnitId ?? null),
        category: parsed.category,
        code: parsed.code,
        conversionFactor: parsed.isBaseUnit ? null : (parsed.conversionFactor ?? null),
        decimalPlaces: parsed.decimalPlaces,
        isActive: parsed.isActive,
        isBaseUnit: parsed.isBaseUnit,
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
