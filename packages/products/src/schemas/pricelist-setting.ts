import { IdSchema } from "#/schemas/utils";

import { boolean, nullable, object, optional } from "valibot";
import type { InferOutput } from "valibot";

export const UpdatePricelistSettingsSchema = object({
  allowBatchSpecific: optional(boolean()),
  allowPartySpecific: optional(boolean()),
  defaultBuyingListId: optional(nullable(IdSchema)),
  defaultSellingListId: optional(nullable(IdSchema)),
  requireValidity: optional(boolean()),
});

export type UpdatePricelistSettingsInput = InferOutput<typeof UpdatePricelistSettingsSchema>;
