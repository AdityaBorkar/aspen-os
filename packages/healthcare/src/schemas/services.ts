import { BranchIdSchema, NameSchema } from "#/schemas/utils";

import { UOM_CATEGORY } from "@aspen-os/constants";
import {
  array,
  boolean,
  gtValue,
  integer,
  maxLength,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  picklist,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const ServiceId = pipe(string(), minLength(1, "Service ID is required"));

const BillingUomCategorySchema = picklist(
  [UOM_CATEGORY.COUNT, UOM_CATEGORY.SESSION],
  "Billing unit must be a Count or Session unit (see UOM master)",
);

const DurationUomCategorySchema = picklist(
  [UOM_CATEGORY.TIME],
  "Duration unit must be a Time unit (see UOM master)",
);

const ServiceUomFields = {
  billingUomCategory: optional(BillingUomCategorySchema),
  billingUomId: optional(pipe(string(), minLength(1))),
  durationUomCategory: optional(DurationUomCategorySchema),
  durationUomId: optional(pipe(string(), minLength(1))),
  durationValue: optional(pipe(number(), gtValue(0, "Duration must be greater than 0"))),
};

export const CreateServiceSchema = object({
  basePrice: optional(number()),
  branchId: BranchIdSchema,
  code: pipe(string(), minLength(1, "Service code is required")),
  department: optional(pipe(string(), minLength(1), maxLength(120))),
  modality: optional(pipe(string(), minLength(1), maxLength(60))),
  name: NameSchema,
  pathy: optional(pipe(string(), minLength(1), maxLength(60))),
  teleExempt: optional(boolean(), false),
  ...ServiceUomFields,
});

export type CreateServiceInput = InferOutput<typeof CreateServiceSchema>;

export const UpdateServiceSchema = object({
  id: ServiceId,
  patch: object({
    basePrice: optional(number()),
    department: optional(nullable(pipe(string(), maxLength(120)))),
    modality: optional(nullable(pipe(string(), maxLength(60)))),
    name: optional(NameSchema),
    pathy: optional(nullable(pipe(string(), maxLength(60)))),
    teleExempt: optional(boolean()),
    ...ServiceUomFields,
  }),
});

export type UpdateServiceInput = InferOutput<typeof UpdateServiceSchema>;

export const ServiceFiltersSchema = object({
  branchId: BranchIdSchema,
  department: optional(string()),
  limit: optional(pipe(number(), integer())),
  modality: optional(string()),
  offset: optional(pipe(number(), integer())),
  pathy: optional(string()),
  search: optional(string()),
  status: optional(string()),
});

export type ServiceFiltersInput = InferOutput<typeof ServiceFiltersSchema>;

export const ServiceIdSchema = object({ id: ServiceId });

export type ServiceIdInput = InferOutput<typeof ServiceIdSchema>;

export const MapFacilitiesSchema = object({
  branchId: BranchIdSchema,
  facilityId: pipe(string(), minLength(1, "Facility ID is required")),
  serviceId: ServiceId,
});

export type MapFacilitiesInput = InferOutput<typeof MapFacilitiesSchema>;

export const SetPriceSchema = object({
  amount: number(),
  branchId: BranchIdSchema,
  effectiveFrom: optional(string()),
  gstPct: optional(pipe(number(), minValue(0))),
  pricelist: optional(string(), "standard"),
  pricelistId: optional(pipe(string(), minLength(1))),
  serviceId: ServiceId,
});

export type SetPriceInput = InferOutput<typeof SetPriceSchema>;

export const CreateDiscountRuleSchema = object({
  branchId: BranchIdSchema,
  code: optional(string()),
  minQty: optional(pipe(number(), integer())),
  pct: number(),
  serviceId: optional(string()),
});

export type CreateDiscountRuleInput = InferOutput<typeof CreateDiscountRuleSchema>;

export const DefinePackageSchema = object({
  branchId: BranchIdSchema,
  name: NameSchema,
  price: number(),
  serviceIds: array(pipe(string(), minLength(1))),
});

export type DefinePackageInput = InferOutput<typeof DefinePackageSchema>;

export const RedeemPackageSchema = object({
  branchId: BranchIdSchema,
  packageId: pipe(string(), minLength(1, "Package ID is required")),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
});

export type RedeemPackageInput = InferOutput<typeof RedeemPackageSchema>;

export const CreatePricelistSchema = object({
  branchId: BranchIdSchema,
  code: pipe(
    string(),
    minLength(1, "Pricelist code is required"),
    maxLength(40, "Pricelist code must be at most 40 characters"),
  ),
  currency: optional(pipe(string(), minLength(3), maxLength(3)), "INR"),
  name: NameSchema,
  payer: optional(pipe(string(), minLength(1), maxLength(60))),
  scope: optional(picklist(["global", "branch"]), "branch"),
  taxInclusive: optional(boolean(), true),
});

export type CreatePricelistInput = InferOutput<typeof CreatePricelistSchema>;

export const UpdatePricelistSchema = object({
  id: ServiceId,
  patch: object({
    currency: optional(pipe(string(), minLength(3), maxLength(3))),
    name: optional(NameSchema),
    payer: optional(nullable(pipe(string(), maxLength(60)))),
    scope: optional(picklist(["global", "branch"])),
    taxInclusive: optional(boolean()),
  }),
});

export type UpdatePricelistInput = InferOutput<typeof UpdatePricelistSchema>;

export const PricelistFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  payer: optional(string()),
  search: optional(string()),
  status: optional(string()),
});

export type PricelistFiltersInput = InferOutput<typeof PricelistFiltersSchema>;

export const PricelistIdSchema = object({ id: ServiceId });

export type PricelistIdInput = InferOutput<typeof PricelistIdSchema>;

export const EnsureDefaultPricelistSchema = object({
  branchId: BranchIdSchema,
  currency: optional(pipe(string(), minLength(3), maxLength(3)), "INR"),
  taxInclusive: optional(boolean(), true),
});

export type EnsureDefaultPricelistInput = InferOutput<typeof EnsureDefaultPricelistSchema>;

export const PublishPricelistSchema = object({
  effectiveFrom: optional(string()),
  effectiveTo: optional(nullable(string())),
  id: ServiceId,
});

export type PublishPricelistInput = InferOutput<typeof PublishPricelistSchema>;

export const ResolvePriceSchema = object({
  branchId: BranchIdSchema,
  date: optional(string()),
  payer: optional(string()),
  pricelistId: optional(pipe(string(), minLength(1))),
  serviceId: ServiceId,
});

export type ResolvePriceInput = InferOutput<typeof ResolvePriceSchema>;

export const PreviewBulkRevisionSchema = object({
  branchId: BranchIdSchema,
  pricelistId: ServiceId,
  rows: optional(
    array(
      object({
        amount: pipe(number(), minValue(0)),
        serviceId: ServiceId,
      }),
    ),
  ),
  upliftPct: optional(number()),
});

export type PreviewBulkRevisionInput = InferOutput<typeof PreviewBulkRevisionSchema>;

export const ApplyBulkRevisionSchema = object({
  approvedBy: pipe(string(), minLength(1, "Approver is required")),
  branchId: BranchIdSchema,
  effectiveFrom: pipe(string(), minLength(1, "Effective date is required")),
  pricelistId: ServiceId,
  requestedBy: pipe(string(), minLength(1, "Requester is required")),
  rows: optional(
    array(
      object({
        amount: pipe(number(), minValue(0)),
        serviceId: ServiceId,
      }),
    ),
  ),
  upliftPct: optional(number()),
});

export type ApplyBulkRevisionInput = InferOutput<typeof ApplyBulkRevisionSchema>;
