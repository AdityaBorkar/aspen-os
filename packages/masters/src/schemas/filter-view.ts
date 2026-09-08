import { FilterViewAccessSchema, FilterViewTypeSchema } from "#/schemas/enums";
import { IdSchema, NameSchema } from "#/schemas/utils";

import { JsonValueSchema } from "@aspen-os/platform/server";
import {
  array,
  boolean,
  check,
  integer,
  maxLength,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  record,
  regex,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const DOMAIN_REGEX = /^[a-z][a-z0-9_-]*:[a-z][a-z0-9_-]*$/;

export const FilterViewDomainSchema = pipe(
  string(),
  minLength(1, "Domain is required"),
  maxLength(255, "Must be at most 255 characters"),
  regex(DOMAIN_REGEX, "Domain must follow the <module>:<entity> convention (e.g. tasks:task)"),
);

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

export const FilterViewConditionSchema = object({
  field: FieldSchema,
  operator: OperatorSchema,
  value: optional(JsonValueSchema),
});

export type FilterViewCondition = InferOutput<typeof FilterViewConditionSchema>;

export const FilterViewSortSchema = object({
  direction: DirectionSchema,
  field: FieldSchema,
});

export type FilterViewSort = InferOutput<typeof FilterViewSortSchema>;

export const CreateFilterViewSchema = object({
  access: optional(FilterViewAccessSchema, "personal"),
  conditions: optional(array(FilterViewConditionSchema), []),
  domain: FilterViewDomainSchema,
  groupBy: optional(nullable(string())),
  isDefault: optional(boolean(), false),
  metadata: optional(record(string(), JsonValueSchema)),
  name: NameSchema,
  ownerId: optional(string()),
  projectId: optional(nullable(IdSchema)),
  sort: optional(array(FilterViewSortSchema), []),
  viewType: optional(FilterViewTypeSchema, "list"),
});

export type CreateFilterViewInput = InferOutput<typeof CreateFilterViewSchema>;

export const UpdateFilterViewSchema = object({
  access: optional(FilterViewAccessSchema),
  conditions: optional(array(FilterViewConditionSchema)),
  domain: optional(FilterViewDomainSchema),
  groupBy: optional(nullable(string())),
  isDefault: optional(boolean()),
  metadata: optional(record(string(), JsonValueSchema)),
  name: optional(NameSchema),
  sort: optional(array(FilterViewSortSchema)),
  viewType: optional(FilterViewTypeSchema),
});

export type UpdateFilterViewInput = InferOutput<typeof UpdateFilterViewSchema>;

export const FilterViewFiltersSchema = object({
  access: optional(FilterViewAccessSchema),
  domain: optional(string()),
  isDefault: optional(boolean()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  projectId: optional(nullable(string())),
  search: optional(string()),
  viewType: optional(FilterViewTypeSchema),
});

export type FilterViewFilters = InferOutput<typeof FilterViewFiltersSchema>;

export const GetDefaultFilterViewSchema = object({
  domain: optional(FilterViewDomainSchema),
  ownerId: IdSchema,
  projectId: optional(nullable(IdSchema)),
});

export type GetDefaultFilterViewInput = InferOutput<typeof GetDefaultFilterViewSchema>;
