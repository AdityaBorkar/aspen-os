import {
  AssetStatusSchema,
  DepreciationFrequencySchema,
  DepreciationMethodSchema,
} from "#/schemas/enums";

import { minLength, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateAssetCategorySchema = object({
  accumulatedAccount: optional(nullable(string())),
  depreciationAccount: optional(nullable(string())),
  depreciationMethod: DepreciationMethodSchema,
  frequency: optional(DepreciationFrequencySchema, "yearly"),
  name: pipe(string(), minLength(1, "Name is required")),
  residualValue: optional(number(), 0),
  usefulLifeYears: optional(number(), 5),
});

export type CreateAssetCategoryInput = InferOutput<typeof CreateAssetCategorySchema>;

export const CreateAssetLocationSchema = object({
  address: optional(nullable(string())),
  name: pipe(string(), minLength(1, "Name is required")),
});

export type CreateAssetLocationInput = InferOutput<typeof CreateAssetLocationSchema>;

export const FinanceBookInputSchema = object({
  depreciationMethod: DepreciationMethodSchema,
  frequency: optional(DepreciationFrequencySchema, "yearly"),
  residualValue: optional(number(), 0),
  usefulLifeYears: optional(number(), 5),
});

export type FinanceBookInput = InferOutput<typeof FinanceBookInputSchema>;

export const CreateAssetSchema = object({
  assetName: pipe(string(), minLength(1, "assetName is required")),
  availableForUseDate: optional(nullable(string())),
  categoryId: pipe(string(), minLength(1, "categoryId is required")),
  custodian: optional(nullable(string())),
  financeBook: optional(FinanceBookInputSchema),
  grossValue: number(),
  insurance: optional(nullable(string())),
  itemId: optional(nullable(string())),
  locationId: optional(nullable(string())),
  openingAccumulatedDepreciation: optional(number(), 0),
  purchaseDate: optional(nullable(string())),
  quantity: optional(number(), 1),
  supplierInvoiceId: optional(nullable(string())),
});

export type CreateAssetInput = InferOutput<typeof CreateAssetSchema>;

export const TransferAssetSchema = object({
  note: optional(nullable(string())),
  toLocationId: pipe(string(), minLength(1, "toLocationId is required")),
});

export type TransferAssetInput = InferOutput<typeof TransferAssetSchema>;

export const RepairAssetSchema = object({
  cost: optional(number(), 0),
  note: optional(nullable(string())),
});

export type RepairAssetInput = InferOutput<typeof RepairAssetSchema>;

export const DisposeAssetSchema = object({
  disposalAccount: optional(nullable(string())),
  disposalDate: pipe(string(), minLength(1, "disposalDate is required")),
  proceeds: optional(number(), 0),
});

export type DisposeAssetInput = InferOutput<typeof DisposeAssetSchema>;

export const AssetFiltersSchema = object({
  categoryId: optional(string()),
  status: optional(AssetStatusSchema),
});

export type AssetFilters = InferOutput<typeof AssetFiltersSchema>;
