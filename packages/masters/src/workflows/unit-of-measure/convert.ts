import { masterUnitOfMeasure } from "#/db-schemas";
import { ConvertQuantitySchema } from "#/types";
import { assertWholeQuantity, convertQuantityMath } from "#/utils/uom-math";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ConvertInputSchema = object({ input: ConvertQuantitySchema });

function factorOf(unit: { conversion_factor: number | null; is_base_unit: boolean }): number {
  if (unit.is_base_unit) {
    return 1;
  }
  if (unit.conversion_factor === null || unit.conversion_factor === undefined) {
    throw new Error("Derived unit is missing its conversion factor.");
  }
  return unit.conversion_factor;
}

export const convertQuantity = Workflow.name("masters.unit-of-measure.convert")
  .input(ConvertInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ConvertQuantitySchema, input);
    const toId = parsed.toUomId ?? parsed.fromUomId;

    // NOTE: both units load in one step because the engine replays a completed
    // step by name — invoking the same fetch step twice would return the first
    // unit for both sides.
    const units = await ctx.step.run("fetch-units", async () => {
      const [from] = await ctx.db
        .select()
        .from(masterUnitOfMeasure)
        .where(eq(masterUnitOfMeasure.id, parsed.fromUomId))
        .limit(1);
      if (!from) {
        throw new Error(`Unit of measure "${parsed.fromUomId}" not found.`);
      }
      if (toId === parsed.fromUomId) {
        return { from, to: from };
      }
      const [to] = await ctx.db
        .select()
        .from(masterUnitOfMeasure)
        .where(eq(masterUnitOfMeasure.id, toId))
        .limit(1);
      if (!to) {
        throw new Error(`Unit of measure "${toId}" not found.`);
      }
      return { from, to };
    });
    const { from, to } = units;

    if (from.category !== to.category) {
      throw new Error(
        `Expects ${from.category} units like "${from.code}" — "${to.code}" belongs to ${to.category}; cross-category conversion is forbidden.`,
      );
    }
    if (!from.is_active || !to.is_active) {
      throw new Error(
        "Conversion needs active units on both sides; a retired unit is in history only.",
      );
    }

    if (from.is_indivisible) {
      assertWholeQuantity(parsed.quantity, `"${from.code}"`);
    }

    const { baseQuantity, convertedQuantity } = convertQuantityMath({
      fromFactor: factorOf(from),
      quantity: parsed.quantity,
      toFactor: factorOf(to),
      toIndivisible: to.is_indivisible,
      toPrecision: to.decimal_places,
    });

    return {
      baseQuantity,
      baseUomId: from.is_base_unit ? from.id : (from.base_unit_id ?? from.id),
      category: from.category,
      convertedQuantity,
      enteredQuantity: parsed.quantity,
      fromUomId: from.id,
      toUomId: to.id,
    };
  });
