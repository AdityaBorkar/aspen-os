import { masterUnitOfMeasure } from "#/db-schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  assignCategoryDefault,
  recordUomVersion,
  todayDateString,
} from "#/workflows/unit-of-measure/shared";
import { assertCodeUnique } from "#/workflows/utils";

import { UOM_CATEGORY } from "@aspen-os/constants";
import type { UomCategory } from "@aspen-os/constants";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

interface SeedRow {
  code: string;
  conversionFactor: number | null;
  decimalPlaces: number;
  isBaseUnit: boolean;
  isDefault: boolean;
  isIndivisible: boolean;
  name: string;
  symbol: string;
}

const SEEDS = {
  [UOM_CATEGORY.AREA]: [],
  [UOM_CATEGORY.COUNT]: [
    {
      code: "PIECE",
      conversionFactor: null,
      decimalPlaces: 0,
      isBaseUnit: true,
      isDefault: false,
      isIndivisible: true,
      name: "Piece",
      symbol: "pc",
    },
    {
      code: "TAB",
      conversionFactor: 1,
      decimalPlaces: 0,
      isBaseUnit: false,
      isDefault: true,
      isIndivisible: true,
      name: "Tablet",
      symbol: "tab",
    },
    {
      code: "STRIP",
      conversionFactor: 10,
      decimalPlaces: 1,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Strip of 10 tablets",
      symbol: "strip",
    },
    {
      code: "BOX",
      conversionFactor: 100,
      decimalPlaces: 1,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Box of 10 strips",
      symbol: "box",
    },
    {
      code: "VIAL",
      conversionFactor: 1,
      decimalPlaces: 0,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: true,
      name: "Vial",
      symbol: "vial",
    },
    {
      code: "AMPOULE",
      conversionFactor: 1,
      decimalPlaces: 0,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: true,
      name: "Ampoule",
      symbol: "amp",
    },
    {
      code: "PACK",
      conversionFactor: 1,
      decimalPlaces: 0,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Pack",
      symbol: "pack",
    },
  ],
  [UOM_CATEGORY.DATA]: [],
  [UOM_CATEGORY.LENGTH]: [
    {
      code: "CM",
      conversionFactor: null,
      decimalPlaces: 2,
      isBaseUnit: true,
      isDefault: true,
      isIndivisible: false,
      name: "Centimetre",
      symbol: "cm",
    },
    {
      code: "INCH",
      conversionFactor: 2.54,
      decimalPlaces: 2,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Inch",
      symbol: "in",
    },
  ],
  [UOM_CATEGORY.MASS]: [
    {
      code: "MG",
      conversionFactor: null,
      decimalPlaces: 2,
      isBaseUnit: true,
      isDefault: true,
      isIndivisible: false,
      name: "Milligram",
      symbol: "mg",
    },
    {
      code: "G",
      conversionFactor: 1000,
      decimalPlaces: 3,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Gram",
      symbol: "g",
    },
    {
      code: "KG",
      conversionFactor: 1_000_000,
      decimalPlaces: 3,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Kilogram",
      symbol: "kg",
    },
  ],
  [UOM_CATEGORY.OTHER]: [],
  [UOM_CATEGORY.SESSION]: [
    {
      code: "SITTING",
      conversionFactor: null,
      decimalPlaces: 0,
      isBaseUnit: true,
      isDefault: true,
      isIndivisible: true,
      name: "Sitting",
      symbol: "sitting",
    },
    {
      code: "SESSION",
      conversionFactor: 1,
      decimalPlaces: 0,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: true,
      name: "Session",
      symbol: "session",
    },
    {
      code: "VISIT",
      conversionFactor: 1,
      decimalPlaces: 0,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: true,
      name: "Visit",
      symbol: "visit",
    },
    {
      code: "CYCLE",
      conversionFactor: 1,
      decimalPlaces: 0,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: true,
      name: "Cycle",
      symbol: "cycle",
    },
    {
      code: "COURSE",
      conversionFactor: 1,
      decimalPlaces: 0,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: true,
      name: "Course",
      symbol: "course",
    },
  ],
  [UOM_CATEGORY.TEMPERATURE]: [],
  [UOM_CATEGORY.TIME]: [
    {
      code: "MIN",
      conversionFactor: null,
      decimalPlaces: 0,
      isBaseUnit: true,
      isDefault: true,
      isIndivisible: false,
      name: "Minute",
      symbol: "min",
    },
    {
      code: "HOUR",
      conversionFactor: 60,
      decimalPlaces: 2,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Hour",
      symbol: "hr",
    },
    {
      code: "DAY",
      conversionFactor: 1440,
      decimalPlaces: 2,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Day",
      symbol: "day",
    },
    {
      code: "WEEK",
      conversionFactor: 10_080,
      decimalPlaces: 2,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Week",
      symbol: "wk",
    },
  ],
  [UOM_CATEGORY.VOLUME]: [
    {
      code: "ML",
      conversionFactor: null,
      decimalPlaces: 2,
      isBaseUnit: true,
      isDefault: true,
      isIndivisible: false,
      name: "Millilitre",
      symbol: "mL",
    },
    {
      code: "L",
      conversionFactor: 1000,
      decimalPlaces: 3,
      isBaseUnit: false,
      isDefault: false,
      isIndivisible: false,
      name: "Litre",
      symbol: "L",
    },
  ],
} satisfies Record<UomCategory, SeedRow[]>;

export const seedUnitsOfMeasure = Workflow.name("masters.unit-of-measure.seed")
  .input(object({}))
  .handler(async (_input, ctx) => {
    let created = 0;
    let skipped = 0;

    // SAFETY: SEEDS keys are exactly the UOM_CATEGORY values, so entries always pair a valid category with its rows.
    const entries = Object.entries(SEEDS) as [UomCategory, SeedRow[]][];
    // oxlint-disable eslint/no-await-in-loop
    for (const [category, rows] of entries) {
      let baseId: string | null = null;

      for (const row of rows.toSorted(
        (left, right) => Number(right.isBaseUnit) - Number(left.isBaseUnit),
      )) {
        const existing = await ctx.step.run(`check-${row.code}`, async () => {
          const [found] = await ctx.db
            .select({ id: masterUnitOfMeasure.id })
            .from(masterUnitOfMeasure)
            .where(eq(masterUnitOfMeasure.code, row.code))
            .limit(1);
          return found ?? null;
        });

        if (existing) {
          skipped += 1;
          if (row.isBaseUnit) {
            baseId = existing.id;
          }
          continue;
        }

        await ctx.step.run(`assert-${row.code}-unique`, () =>
          assertCodeUnique({
            code: row.code,
            db: ctx.db,
            label: "Unit of measure",
            table: masterUnitOfMeasure,
          }),
        );

        const [unit] = await ctx.step.run(`insert-${row.code}`, async () =>
          ctx.db
            .insert(masterUnitOfMeasure)
            .values({
              base_unit_id: row.isBaseUnit ? null : baseId,
              category,
              code: row.code,
              conversion_factor: row.isBaseUnit ? null : row.conversionFactor,
              decimal_places: row.decimalPlaces,
              is_active: true,
              is_base_unit: row.isBaseUnit,
              is_default: false,
              is_indivisible: row.isIndivisible,
              is_system: true,
              name: row.name,
              status: "published",
              symbol: row.symbol,
            })
            .returning(),
        );

        if (!unit) {
          throw new Error(`Failed to seed unit "${row.code}".`);
        }
        created += 1;

        if (row.isBaseUnit) {
          baseId = unit.id;
        }

        await ctx.step.run(`version-${row.code}`, () =>
          recordUomVersion({
            conversionFactor: unit.conversion_factor,
            db: ctx.db,
            decimalPlaces: unit.decimal_places,
            effectiveFrom: todayDateString(),
            reason: "System seed",
            uomId: unit.id,
          }),
        );

        if (row.isDefault) {
          await ctx.step.run(`default-${row.code}`, () =>
            assignCategoryDefault({ category, db: ctx.db, id: unit.id }),
          );
        }
      }
    }
    // oxlint-enable eslint/no-await-in-loop

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: "seed",
        entityType: AUDIT_ENTITY_TYPE.UNIT_OF_MEASURE,
        newState: { created, skipped },
      });
    });

    return { created, skipped };
  });
