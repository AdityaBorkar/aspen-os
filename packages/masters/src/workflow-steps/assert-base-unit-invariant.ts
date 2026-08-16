import { masterUnitOfMeasure } from "#/db-schemas";
import { UomCategorySchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { WorkflowStep } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { boolean, nullish, number, object, optional, string } from "valibot";

const AssertBaseUnitInvariantInputSchema = object({
  baseUnitId: nullish(IdSchema),
  category: UomCategorySchema,
  conversionFactor: nullish(number()),
  excludeId: optional(string()),
  isBaseUnit: boolean(),
});

export const assertBaseUnitInvariantStep = WorkflowStep.name(
  "masters-assert-uom-base-unit-invariant",
)
  .input(AssertBaseUnitInvariantInputSchema)
  .handler(async (input, ctx) => {
    if (input.isBaseUnit) {
      if (input.baseUnitId) {
        throw new Error("A base unit cannot reference another base unit.");
      }
      if (input.conversionFactor !== undefined && input.conversionFactor !== null) {
        throw new Error("A base unit cannot define a conversion factor.");
      }

      const conditions = [
        eq(masterUnitOfMeasure.category, input.category),
        eq(masterUnitOfMeasure.isBaseUnit, true),
        input.excludeId ? ne(masterUnitOfMeasure.id, input.excludeId) : undefined,
      ];

      const [existingBase] = await ctx.db
        .select({ id: masterUnitOfMeasure.id })
        .from(masterUnitOfMeasure)
        .where(and(...conditions))
        .limit(1);

      if (existingBase) {
        throw new Error(
          `A base unit already exists for category "${input.category}". Demote it before adding a new one.`,
        );
      }

      return;
    }

    if (!input.baseUnitId) {
      throw new Error("A derived unit must reference a base unit.");
    }
    if (input.conversionFactor === undefined || input.conversionFactor === null) {
      throw new Error("A derived unit must define a conversion factor.");
    }

    const baseConditions = [
      eq(masterUnitOfMeasure.id, input.baseUnitId),
      eq(masterUnitOfMeasure.category, input.category),
      eq(masterUnitOfMeasure.isBaseUnit, true),
      input.excludeId ? ne(masterUnitOfMeasure.id, input.excludeId) : undefined,
    ];

    const [base] = await ctx.db
      .select({ id: masterUnitOfMeasure.id })
      .from(masterUnitOfMeasure)
      .where(and(...baseConditions))
      .limit(1);

    if (!base) {
      throw new Error(
        `baseUnitId must reference a base unit of the same category ("${input.category}").`,
      );
    }
  });
