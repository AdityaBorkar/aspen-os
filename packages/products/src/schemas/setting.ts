import { NamingModeSchema, ValuationMethodSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { boolean, nullable, number, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const UpdateSettingsSchema = object({
  allowNegativeStock: optional(boolean()),
  autoInsertPriceIfMissing: optional(boolean()),
  batchNamingSeries: optional(nullable(string())),
  cleanDescriptionHtml: optional(boolean()),
  defaultItemGroupId: optional(nullable(IdSchema)),
  defaultStockUom: optional(string()),
  defaultValuationMethod: optional(ValuationMethodSchema),
  defaultWarehouseId: optional(nullable(IdSchema)),
  itemNamingBy: optional(NamingModeSchema),
  limitPercent: optional(number()),
  overDeliverReceiveRole: optional(nullable(string())),
  sampleRetentionWarehouseId: optional(nullable(IdSchema)),
  serialBatchEnabled: optional(boolean()),
  showBarcodeField: optional(boolean()),
});

export type UpdateSettingsInput = InferOutput<typeof UpdateSettingsSchema>;
