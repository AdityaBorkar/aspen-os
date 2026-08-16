import { IdSchema } from "#/schemas/utils";

import { object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const PinItemInputSchema = object({
  itemId: IdSchema,
  itemType: string(),
  userId: optional(IdSchema),
});

export type PinItemInput = InferOutput<typeof PinItemInputSchema>;

export const ListPinsSchema = object({
  itemType: optional(string()),
});

export type ListPinsInput = InferOutput<typeof ListPinsSchema>;

export const UnpinItemSchema = object({
  id: IdSchema,
});

export type UnpinItemInput = InferOutput<typeof UnpinItemSchema>;
