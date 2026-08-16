import { WorkspaceItemTypeSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { object, optional } from "valibot";
import type { InferOutput } from "valibot";

export const SubscribeWatchSchema = object({
  itemId: IdSchema,
  itemType: WorkspaceItemTypeSchema,
});

export type SubscribeWatchInput = InferOutput<typeof SubscribeWatchSchema>;

export const UnsubscribeWatchSchema = object({
  id: IdSchema,
});

export type UnsubscribeWatchInput = InferOutput<typeof UnsubscribeWatchSchema>;

export const ListWatchesSchema = object({
  itemType: optional(WorkspaceItemTypeSchema),
});

export type ListWatchesInput = InferOutput<typeof ListWatchesSchema>;
