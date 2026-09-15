import { healthcarePricelist } from "#/db-schemas/billing";
import type { healthcareDiscountRule, healthcareServicePrice } from "#/db-schemas/services";
import { healthcarePackageDef, healthcareService } from "#/db-schemas/services";
import { WithIdSchema } from "#/schemas";

import type { JsonValue } from "@aspen-os/platform/server";
import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, number, object, string } from "valibot";

export const fetchServiceStep = WorkflowStep.name("healthcare-fetch-service")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcareService)
      .where(eq(healthcareService.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Service "${input.id}" not found.`);
    }
    return row;
  });

export const fetchPackageStep = WorkflowStep.name("healthcare-fetch-package")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcarePackageDef)
      .where(eq(healthcarePackageDef.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Package "${input.id}" not found.`);
    }
    return row;
  });

export interface ServiceDto {
  basePrice: number | null;
  billingUomCategory: string | null;
  billingUomId: string | null;
  branchId: string;
  code: string;
  createdAt: string;
  department: string | null;
  durationUomCategory: string | null;
  durationUomId: string | null;
  durationValue: number | null;
  facilityIds: string[];
  id: string;
  modality: string | null;
  name: string;
  pathy: string | null;
  status: string;
  teleExempt: boolean;
  updatedAt: string;
}

export function toServiceDto(row: typeof healthcareService.$inferSelect): ServiceDto {
  return {
    basePrice: row.base_price === null ? null : Number(row.base_price),
    billingUomCategory: row.billing_uom_category,
    billingUomId: row.billing_uom_id,
    branchId: row.branch_id,
    code: row.code,
    createdAt: row.created_at.toISOString(),
    department: row.department,
    durationUomCategory: row.duration_uom_category,
    durationUomId: row.duration_uom_id,
    durationValue: row.duration_value === null ? null : Number(row.duration_value),
    facilityIds: row.facility_ids,
    id: row.id,
    modality: row.modality,
    name: row.name,
    pathy: row.pathy,
    status: row.status,
    teleExempt: row.tele_exempt,
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface ServicePriceDto {
  amount: number;
  branchId: string;
  createdAt: string;
  effectiveFrom: string;
  gstPct: number | null;
  id: string;
  pricelist: string;
  pricelistId: string | null;
  serviceId: string;
  updatedAt: string;
}

export function toServicePriceDto(
  row: typeof healthcareServicePrice.$inferSelect,
): ServicePriceDto {
  return {
    amount: Number(row.amount),
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    effectiveFrom: row.effective_from,
    gstPct: row.gst_pct === null ? null : Number(row.gst_pct),
    id: row.id,
    pricelist: row.pricelist,
    pricelistId: row.pricelist_id,
    serviceId: row.service_id,
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface DiscountRuleDto {
  branchId: string;
  code: string | null;
  createdAt: string;
  id: string;
  minQty: number | null;
  pct: number;
  serviceId: string | null;
  updatedAt: string;
}

export function toDiscountRuleDto(
  row: typeof healthcareDiscountRule.$inferSelect,
): DiscountRuleDto {
  return {
    branchId: row.branch_id,
    code: row.code,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    minQty: row.min_qty,
    pct: Number(row.pct),
    serviceId: row.service_id,
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface PackageRedemption {
  id: string;
  patientId: string;
  redeemedAt: string;
  [key: string]: JsonValue;
}

export interface PackageCounters {
  redemptions: PackageRedemption[];
  redeemedCount: number;
  totalRedemptions: number;
}

const PackageRedemptionSchema = object({
  id: string(),
  patientId: string(),
  redeemedAt: string(),
});

export function readPackageCounters(payload: Record<string, JsonValue>): PackageCounters {
  const total = payload.totalRedemptions;
  const redeemed = payload.redeemedCount;
  const raw = payload.redemptions;
  const entries: JsonValue[] = Array.isArray(raw) ? raw : [];
  const redemptions = entries
    .filter((entry: JsonValue): entry is PackageRedemption => is(PackageRedemptionSchema, entry))
    .map((entry) => ({
      id: entry.id ?? "",
      patientId: entry.patientId ?? "",
      redeemedAt: entry.redeemedAt ?? "",
    }));
  return {
    redeemedCount: is(number(), redeemed) ? redeemed : redemptions.length,
    redemptions,
    totalRedemptions: is(number(), total) ? total : 1,
  };
}

export interface PackageDefDto extends PackageCounters {
  branchId: string;
  createdAt: string;
  id: string;
  name: string;
  price: number;
  serviceIds: string[];
  status: string;
  updatedAt: string;
}

export function toPackageDefDto(row: typeof healthcarePackageDef.$inferSelect): PackageDefDto {
  return {
    ...readPackageCounters(row.payload),
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    name: row.name,
    price: Number(row.price),
    serviceIds: row.service_ids,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}

export const fetchPricelistStep = WorkflowStep.name("healthcare-fetch-pricelist")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcarePricelist)
      .where(eq(healthcarePricelist.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Pricelist "${input.id}" not found.`);
    }
    return row;
  });

export interface PricelistDto {
  branchId: string;
  code: string;
  createdAt: string;
  currency: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  id: string;
  isDefault: boolean;
  name: string;
  payer: string | null;
  scope: string;
  status: string;
  taxInclusive: boolean;
  updatedAt: string;
  version: number;
}

export function toPricelistDto(row: typeof healthcarePricelist.$inferSelect): PricelistDto {
  return {
    branchId: row.branch_id,
    code: row.code,
    createdAt: row.created_at.toISOString(),
    currency: row.currency,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    id: row.id,
    isDefault: row.is_default,
    name: row.name,
    payer: row.payer,
    scope: row.scope,
    status: row.status,
    taxInclusive: row.tax_inclusive,
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}
