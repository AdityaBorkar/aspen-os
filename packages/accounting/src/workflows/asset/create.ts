import {
  accountingAsset,
  accountingAssetCategory,
  accountingDepreciationSchedule,
} from "#/db-schemas/asset";
import { ASSET_EVENTS } from "#/pubsub";
import { CreateAssetSchema } from "#/schemas/asset";
import { buildDepreciationSchedule } from "#/services/depreciation-service";
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  DEPRECIATION_FREQUENCY,
  DEPRECIATION_METHOD,
} from "#/utils/constants";
import type { DepreciationFrequency, DepreciationMethod } from "#/utils/constants";
import { roundMoney, toMoney, todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateAssetSchema });

function toDepreciationMethod(value: string): DepreciationMethod {
  if (value === DEPRECIATION_METHOD.STRAIGHT_LINE) {
    return DEPRECIATION_METHOD.STRAIGHT_LINE;
  }
  if (value === DEPRECIATION_METHOD.WRITTEN_DOWN_VALUE) {
    return DEPRECIATION_METHOD.WRITTEN_DOWN_VALUE;
  }
  if (value === DEPRECIATION_METHOD.DOUBLE_DECLINING_BALANCE) {
    return DEPRECIATION_METHOD.DOUBLE_DECLINING_BALANCE;
  }
  throw new Error(`Unsupported depreciation method "${value}".`);
}

function toDepreciationFrequency(value: string): DepreciationFrequency {
  if (value === DEPRECIATION_FREQUENCY.MONTHLY) {
    return DEPRECIATION_FREQUENCY.MONTHLY;
  }
  if (value === DEPRECIATION_FREQUENCY.QUARTERLY) {
    return DEPRECIATION_FREQUENCY.QUARTERLY;
  }
  if (value === DEPRECIATION_FREQUENCY.YEARLY) {
    return DEPRECIATION_FREQUENCY.YEARLY;
  }
  throw new Error(`Unsupported depreciation frequency "${value}".`);
}

export const createAsset = Workflow.name("accounting.asset.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAssetSchema, input);

    const [category] = await ctx.db
      .select()
      .from(accountingAssetCategory)
      .where(eq(accountingAssetCategory.id, parsed.categoryId))
      .limit(1);
    if (!category) {
      throw new Error(`Asset category "${parsed.categoryId}" not found.`);
    }

    const method = toDepreciationMethod(
      parsed.financeBook?.depreciationMethod ?? category.depreciation_method,
    );
    const frequency = toDepreciationFrequency(parsed.financeBook?.frequency ?? category.frequency);
    const residual = parsed.financeBook?.residualValue ?? Number(category.residual_value ?? 0);
    const life = Math.trunc(parsed.financeBook?.usefulLifeYears ?? category.useful_life_years ?? 5);
    const gross = parsed.grossValue;
    if (gross <= 0) {
      throw new Error("Asset gross value must be positive.");
    }
    if (residual < 0 || residual >= gross) {
      throw new Error("Residual value must be non-negative and below gross value.");
    }

    const availableDate = parsed.availableForUseDate ?? parsed.purchaseDate ?? todayDateOnly();
    const openingAccumulated = parsed.openingAccumulatedDepreciation ?? 0;
    if (openingAccumulated < 0 || openingAccumulated >= gross - residual) {
      throw new Error("Opening accumulated depreciation must be below depreciable value.");
    }
    const openingBook = gross - openingAccumulated;

    const [asset] = await ctx.db
      .insert(accountingAsset)
      .values({
        accumulated_depreciation: toMoney(openingAccumulated),
        asset_name: parsed.assetName,
        available_for_use_date: availableDate,
        book_value: toMoney(openingBook),
        category_id: parsed.categoryId,
        custodian: parsed.custodian ?? null,
        depreciation_method: method,
        frequency,
        gross_value: toMoney(gross),
        insurance: parsed.insurance ? { ref: parsed.insurance } : {},
        item_id: parsed.itemId ?? null,
        location_id: parsed.locationId ?? null,
        purchase_date: parsed.purchaseDate ?? null,
        quantity: toMoney(parsed.quantity ?? 1),
        repair_log: [],
        residual_value: toMoney(residual),
        status: "draft",
        supplier_invoice_id: parsed.supplierInvoiceId ?? null,
        transfer_history: [],
        useful_life_years: life,
      })
      .returning();

    if (!asset) {
      throw new Error("Failed to create asset.");
    }

    const schedule = buildDepreciationSchedule({
      availableForUseDate: availableDate,
      depreciationMethod: method,
      frequency,
      grossValue: gross,
      residualValue: residual,
      usefulLifeYears: life,
    });

    if (schedule.length > 0) {
      await ctx.db.insert(accountingDepreciationSchedule).values(
        schedule.map((row) => ({
          amount: toMoney(roundMoney(row.amount)),
          asset_id: asset.id,
          expected_date: row.expectedDate,
          journal_id: null,
          status: "scheduled" as const,
        })),
      );
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: asset.id,
        entityType: AUDIT_ENTITY_TYPE.ASSET,
        newState: { assetName: asset.asset_name, grossValue: gross },
      });
      await ctx.pubsub.publish(ASSET_EVENTS.CREATED, { assetId: asset.id });
    });

    return asset;
  });
