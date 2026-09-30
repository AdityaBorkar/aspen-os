import { NamingModeSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { boolean, nullable, number, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

// Single owner: products owns master/UI defaults only. Stock-policy keys
// (allowNegativeStock, defaultValuationMethod, sampleRetentionWarehouseId,
// batchNamingSeries) are owned by inventory.settings.
export const UpdateSettingsSchema = object({
  autoInsertPriceIfMissing: optional(boolean()),
  cleanDescriptionHtml: optional(boolean()),
  defaultItemGroupId: optional(nullable(IdSchema)),
  defaultStockUom: optional(string()),
  defaultWarehouseId: optional(nullable(IdSchema)),
  itemNamingBy: optional(NamingModeSchema),
  limitPercent: optional(number()),
  overDeliverReceiveRole: optional(nullable(string())),
  serialBatchEnabled: optional(boolean()),
  showBarcodeField: optional(boolean()),
});

export type UpdateSettingsInput = InferOutput<typeof UpdateSettingsSchema>;
