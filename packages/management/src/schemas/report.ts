import {
  date,
  type InferOutput,
  integer,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

export const TenantUsageFiltersSchema = object({
  status: optional(string()),
});

export type TenantUsageFilters = InferOutput<typeof TenantUsageFiltersSchema>;

export const LifecycleReportFiltersSchema = object({
  from: optional(date()),
  status: optional(string()),
  to: optional(date()),
});

export type LifecycleReportFilters = InferOutput<
  typeof LifecycleReportFiltersSchema
>;

export const AuditReportFiltersSchema = object({
  action: optional(string()),
  actorId: optional(string()),
  entityType: optional(string()),
  from: optional(date()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  to: optional(date()),
});

export type AuditReportFilters = InferOutput<typeof AuditReportFiltersSchema>;
