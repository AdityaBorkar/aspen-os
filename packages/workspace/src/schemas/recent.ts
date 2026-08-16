import { WorkspaceItemTypeSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { integer, number, object, optional, pipe } from "valibot";
import type { InferOutput } from "valibot";

export const TouchRecentSchema = object({
  itemId: IdSchema,
  itemType: WorkspaceItemTypeSchema,
});

export type TouchRecentInput = InferOutput<typeof TouchRecentSchema>;

export const ListRecentSchema = object({
  itemType: optional(WorkspaceItemTypeSchema),
  limit: optional(pipe(number(), integer())),
});

export type ListRecentInput = InferOutput<typeof ListRecentSchema>;
