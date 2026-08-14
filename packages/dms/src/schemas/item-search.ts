import {
  array,
  date,
  type InferOutput,
  number,
  object,
  optional,
  string,
} from "valibot";

import { DriveSearchScopeSchema, ItemTypeSchema } from "./item-enums";

export const DriveSearchOptionsSchema = object({
  contentType: optional(string()),
  dateFrom: optional(date()),
  dateTo: optional(date()),
  labels: optional(array(string())),
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  ownerId: optional(string()),
  query: optional(string()),
  scope: optional(DriveSearchScopeSchema, "all"),
  sizeMax: optional(number()),
  sizeMin: optional(number()),
  type: optional(ItemTypeSchema),
  userId: optional(string()),
});

export type DriveSearchOptions = InferOutput<typeof DriveSearchOptionsSchema>;
