import { BranchIdSchema, NameSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  integer,
  minLength,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const ServiceId = pipe(string(), minLength(1, "Service ID is required"));

export const CreateServiceSchema = object({
  basePrice: optional(number()),
  branchId: BranchIdSchema,
  code: pipe(string(), minLength(1, "Service code is required")),
  name: NameSchema,
  teleExempt: optional(boolean(), false),
});

export type CreateServiceInput = InferOutput<typeof CreateServiceSchema>;

export const UpdateServiceSchema = object({
  id: ServiceId,
  patch: object({
    basePrice: optional(number()),
    name: optional(NameSchema),
    teleExempt: optional(boolean()),
  }),
});

export type UpdateServiceInput = InferOutput<typeof UpdateServiceSchema>;

export const ServiceFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
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
  pricelist: optional(string(), "standard"),
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
