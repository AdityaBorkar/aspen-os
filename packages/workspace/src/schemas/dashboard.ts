import { WorkspaceAccessSchema } from "#/schemas/enums";
import { JsonValueSchema } from "#/schemas/json";
import { NameSchema } from "#/schemas/utils";
import { WidgetPlacementSchema, WidgetSnapshotSchema } from "#/schemas/widget";

import { array, integer, nullable, number, object, optional, pipe, record, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateDashboardSchema = object({
  access: optional(WorkspaceAccessSchema, "personal"),
  description: optional(nullable(string())),
  layout: optional(array(WidgetPlacementSchema), []),
  metadata: optional(record(string(), JsonValueSchema)),
  name: NameSchema,
  ownerId: optional(string()),
});

export type CreateDashboardInput = InferOutput<typeof CreateDashboardSchema>;

export const UpdateDashboardSchema = object({
  access: optional(WorkspaceAccessSchema),
  description: optional(nullable(string())),
  layout: optional(array(WidgetPlacementSchema)),
  metadata: optional(record(string(), JsonValueSchema)),
  name: optional(NameSchema),
});

export type UpdateDashboardInput = InferOutput<typeof UpdateDashboardSchema>;

export const DashboardFiltersSchema = object({
  access: optional(WorkspaceAccessSchema),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  search: optional(string()),
});

export type DashboardFilters = InferOutput<typeof DashboardFiltersSchema>;

export const DashboardSnapshotSchema = object({
  description: optional(nullable(string())),
  metadata: optional(record(string(), JsonValueSchema)),
  name: NameSchema,
});

export type DashboardSnapshot = InferOutput<typeof DashboardSnapshotSchema>;

export const DashboardExportSchema = object({
  dashboard: DashboardSnapshotSchema,
  layout: array(WidgetPlacementSchema),
  widgets: array(WidgetSnapshotSchema),
});

export type DashboardExport = InferOutput<typeof DashboardExportSchema>;

export const ExportDashboardSchema = object({ id: string() });

export const ImportDashboardSchema = object({
  access: optional(WorkspaceAccessSchema),
  dashboard: DashboardSnapshotSchema,
  layout: optional(array(WidgetPlacementSchema), []),
  widgets: array(WidgetSnapshotSchema),
});

export type ImportDashboardInput = InferOutput<typeof ImportDashboardSchema>;
