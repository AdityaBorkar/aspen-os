import {
  array,
  boolean,
  check,
  type InferOutput,
  maxLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
  unknown,
} from "valibot";

import { NameSchema } from "./utils";

const FieldSchema = pipe(
  string(),
  maxLength(255),
  check((val) => val.length > 0, "Condition field is required"),
);

const OperatorSchema = pipe(
  string(),
  maxLength(64),
  check((val) => val.length > 0, "Condition operator is required"),
);

const DirectionSchema = pipe(
  string(),
  check((val) => val === "asc" || val === "desc", "Direction must be asc or desc"),
);

export const ViewConditionSchema = object({
  field: FieldSchema,
  operator: OperatorSchema,
  value: optional(unknown()),
});

export type ViewCondition = InferOutput<typeof ViewConditionSchema>;

export const ViewSortSchema = object({
  direction: DirectionSchema,
  field: FieldSchema,
});

export type ViewSort = InferOutput<typeof ViewSortSchema>;

export const CreateViewSchema = object({
  filters: optional(array(ViewConditionSchema), []),
  isDefault: optional(boolean(), false),
  isShared: optional(boolean(), false),
  name: NameSchema,
  ownerId: string(),
  sort: optional(array(ViewSortSchema), []),
});

export type CreateViewInput = InferOutput<typeof CreateViewSchema>;

export const UpdateViewSchema = object({
  filters: optional(array(ViewConditionSchema)),
  isDefault: optional(boolean()),
  isShared: optional(boolean()),
  name: optional(NameSchema),
  sort: optional(array(ViewSortSchema)),
});

export type UpdateViewInput = InferOutput<typeof UpdateViewSchema>;

export const PinViewSchema = object({
  pinned: boolean(),
});

export type PinViewInput = InferOutput<typeof PinViewSchema>;

export const SetDefaultViewSchema = object({
  isDefault: boolean(),
});

export type SetDefaultViewInput = InferOutput<typeof SetDefaultViewSchema>;

export const ApplyViewSchema = object({
  filters: optional(array(ViewConditionSchema)),
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  sort: optional(array(ViewSortSchema)),
  viewId: optional(nullable(string())),
});

export type ApplyViewInput = InferOutput<typeof ApplyViewSchema>;

export const DateRangeSchema = object({
  end: optional(nullable(string())),
  start: optional(string()),
});

export const SizeRangeSchema = object({
  max: optional(number()),
  min: optional(number()),
});

export const SearchOptionsSchema = object({
  classId: optional(string()),
  contentType: optional(string()),
  dateRange: optional(DateRangeSchema),
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  scope: optional(string(), "mine"),
  sizeRange: optional(SizeRangeSchema),
  sort: optional(array(ViewSortSchema)),
  status: optional(string()),
  tags: optional(array(string())),
});

export type SearchOptions = InferOutput<typeof SearchOptionsSchema>;

export const QuickSearchSchema = object({
  limit: optional(number(), 10),
  query: pipe(
    string(),
    check((val) => val.length > 0, "Query is required"),
  ),
});

export type QuickSearchInput = InferOutput<typeof QuickSearchSchema>;
