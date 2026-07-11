import {
  array,
  date,
  type InferOutput,
  number,
  object,
  optional,
  string,
} from "valibot";

import { DriveItemTypeSchema, DriveSearchScopeSchema } from "./enums";

export const SearchOptionsSchema = object({
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
  type: optional(DriveItemTypeSchema),
  userId: optional(string()),
});

export type SearchOptions = InferOutput<typeof SearchOptionsSchema>;
