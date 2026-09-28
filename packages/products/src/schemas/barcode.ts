import { BarcodeTypeSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const AddBarcodeSchema = object({
  barcode: string(),
  barcodeType: optional(BarcodeTypeSchema, "other"),
  itemId: IdSchema,
  uom: optional(nullable(string())),
});

export type AddBarcodeInput = InferOutput<typeof AddBarcodeSchema>;

export const ListBarcodesSchema = object({
  itemId: optional(IdSchema),
});

export type ListBarcodesInput = InferOutput<typeof ListBarcodesSchema>;
