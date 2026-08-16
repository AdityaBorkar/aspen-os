import { WorkspaceAccessSchema } from "#/schemas/enums";
import { JsonValueSchema } from "#/schemas/json";
import { DomainSchema, NameSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  check,
  integer,
  maxLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  record,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

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
  value: optional(JsonValueSchema),
});

export type ViewCondition = InferOutput<typeof ViewConditionSchema>;

export const ViewSortSchema = object({
  direction: DirectionSchema,
  field: FieldSchema,
});

export type ViewSort = InferOutput<typeof ViewSortSchema>;

export const CreateViewSchema = object({
  access: optional(WorkspaceAccessSchema, "personal"),
  conditions: optional(array(ViewConditionSchema), []),
  domain: DomainSchema,
  groupBy: optional(nullable(string())),
  isDefault: optional(boolean(), false),
  metadata: optional(record(string(), JsonValueSchema)),
  name: NameSchema,
  ownerId: optional(string()),
  sort: optional(array(ViewSortSchema), []),
});

export type CreateViewInput = InferOutput<typeof CreateViewSchema>;

export const UpdateViewSchema = object({
  access: optional(WorkspaceAccessSchema),
  conditions: optional(array(ViewConditionSchema)),
  domain: optional(DomainSchema),
  groupBy: optional(nullable(string())),
  isDefault: optional(boolean()),
  metadata: optional(record(string(), JsonValueSchema)),
  name: optional(NameSchema),
  sort: optional(array(ViewSortSchema)),
});

export type UpdateViewInput = InferOutput<typeof UpdateViewSchema>;

export const ApplyViewSchema = object({
  id: string(),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export type ApplyViewInput = InferOutput<typeof ApplyViewSchema>;

export const ViewFiltersSchema = object({
  access: optional(WorkspaceAccessSchema),
  domain: optional(string()),
  isDefault: optional(boolean()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  search: optional(string()),
});

export type ViewFilters = InferOutput<typeof ViewFiltersSchema>;
