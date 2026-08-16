import { EmbedKindSchema, WidgetAggregationSchema, WidgetTypeSchema } from "#/schemas/enums";
import { NameSchema } from "#/schemas/utils";
import { ViewConditionSchema } from "#/schemas/view";

import {
  array,
  integer,
  nullable,
  number,
  object,
  optional,
  pipe,
  picklist,
  string,
  union,
} from "valibot";
import type { InferOutput } from "valibot";

export const WidgetRangeSchema = object({
  from: optional(nullable(string())),
  preset: picklist([
    "today",
    "yesterday",
    "this_week",
    "last_7_days",
    "this_month",
    "this_quarter",
    "this_year",
    "all_time",
    "custom",
  ]),
  to: optional(nullable(string())),
});

export type WidgetRange = InferOutput<typeof WidgetRangeSchema>;

export const MetricConfigSchema = object({
  aggregation: WidgetAggregationSchema,
  field: optional(string()),
  range: optional(WidgetRangeSchema),
});

export type MetricConfig = InferOutput<typeof MetricConfigSchema>;

export const BreakdownConfigSchema = object({
  field: string(),
  limit: optional(pipe(number(), integer())),
  order: optional(picklist(["asc", "desc"])),
  range: optional(WidgetRangeSchema),
});

export type BreakdownConfig = InferOutput<typeof BreakdownConfigSchema>;

export const ListConfigSchema = object({
  columns: optional(array(string())),
  limit: optional(pipe(number(), integer())),
  range: optional(WidgetRangeSchema),
});

export type ListConfig = InferOutput<typeof ListConfigSchema>;

export const EmbedConfigSchema = object({
  content: string(),
  height: optional(number()),
  kind: EmbedKindSchema,
});

export type EmbedConfig = InferOutput<typeof EmbedConfigSchema>;

export const WidgetConfigSchema = union([
  MetricConfigSchema,
  BreakdownConfigSchema,
  ListConfigSchema,
  EmbedConfigSchema,
]);

export type WidgetConfig = InferOutput<typeof WidgetConfigSchema>;

// oxlint-disable eslint/id-length
export const WidgetPlacementSchema = object({
  h: number(),
  w: number(),
  widgetId: string(),
  x: number(),
  y: number(),
});
// oxlint-enable eslint/id-length

export type WidgetPlacement = InferOutput<typeof WidgetPlacementSchema>;

export const AddWidgetSchema = object({
  config: WidgetConfigSchema,
  dashboardId: string(),
  domain: optional(nullable(string())),
  filter: optional(nullable(array(ViewConditionSchema))),
  title: NameSchema,
  type: WidgetTypeSchema,
  viewId: optional(nullable(string())),
});

export type AddWidgetInput = InferOutput<typeof AddWidgetSchema>;

export const UpdateWidgetSchema = object({
  config: optional(WidgetConfigSchema),
  domain: optional(nullable(string())),
  filter: optional(nullable(array(ViewConditionSchema))),
  title: optional(NameSchema),
  type: optional(WidgetTypeSchema),
  viewId: optional(nullable(string())),
});

export type UpdateWidgetInput = InferOutput<typeof UpdateWidgetSchema>;

export const MoveWidgetSchema = object({
  id: string(),
  placement: WidgetPlacementSchema,
});

export type MoveWidgetInput = InferOutput<typeof MoveWidgetSchema>;

export const RefreshWidgetSchema = object({
  error: optional(nullable(string())),
  id: string(),
});

export type RefreshWidgetInput = InferOutput<typeof RefreshWidgetSchema>;

export const WidgetFiltersSchema = object({
  dashboardId: string(),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export type WidgetFilters = InferOutput<typeof WidgetFiltersSchema>;

export const WidgetSnapshotSchema = object({
  config: WidgetConfigSchema,
  domain: optional(nullable(string())),
  filter: optional(nullable(array(ViewConditionSchema))),
  id: optional(string()),
  title: NameSchema,
  type: WidgetTypeSchema,
  viewId: optional(nullable(string())),
});

export type WidgetSnapshot = InferOutput<typeof WidgetSnapshotSchema>;
