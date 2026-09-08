import { HexColorSchema, IdSchema } from "#/schemas/utils";

import {
  boolean,
  check,
  integer,
  maxLength,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const LabelNameSchema = pipe(
  string(),
  minLength(1, "Label name is required"),
  maxLength(100, "Must be at most 100 characters"),
);

export const CreateLabelSchema = pipe(
  object({
    color: optional(nullable(HexColorSchema)),
    name: LabelNameSchema,
    scopeId: optional(nullable(IdSchema)),
    scopeType: optional(nullable(pipe(string(), maxLength(64, "Must be at most 64 characters")))),
  }),
  check(
    (value) =>
      (value.scopeType == null && value.scopeId == null) ||
      (value.scopeType != null && value.scopeId != null),
    "scopeType and scopeId must both be set or both be null for global labels",
  ),
);

export type CreateLabelInput = InferOutput<typeof CreateLabelSchema>;

export const UpdateLabelSchema = pipe(
  object({
    color: optional(nullable(HexColorSchema)),
    name: optional(LabelNameSchema),
    scopeId: optional(nullable(IdSchema)),
    scopeType: optional(nullable(pipe(string(), maxLength(64, "Must be at most 64 characters")))),
  }),
  check(
    (value) =>
      value.scopeType === undefined ||
      value.scopeId === undefined ||
      (value.scopeType == null && value.scopeId == null) ||
      (value.scopeType != null && value.scopeId != null),
    "scopeType and scopeId must both be set or both be null",
  ),
);

export type UpdateLabelInput = InferOutput<typeof UpdateLabelSchema>;

export const LabelFiltersSchema = object({
  scopeId: optional(nullable(IdSchema)),
  scopeType: optional(nullable(string())),
  search: optional(string()),
});

export type LabelFilters = InferOutput<typeof LabelFiltersSchema>;

export const ListLabelsSchema = object({
  filters: optional(LabelFiltersSchema),
  includeGlobal: optional(boolean(), true),
  limit: optional(pipe(number(), integer(), minValue(1))),
  offset: optional(pipe(number(), integer(), minValue(0))),
  scopeId: optional(nullable(IdSchema)),
  scopeType: optional(nullable(string())),
});

export type ListLabelsInput = InferOutput<typeof ListLabelsSchema>;

export const ApplyLabelSchema = object({
  appliedBy: pipe(string(), minLength(1, "appliedBy is required")),
  entityId: pipe(string(), minLength(1, "entityId is required")),
  entityType: pipe(string(), minLength(1, "entityType is required")),
  labelId: pipe(string(), minLength(1, "labelId is required")),
});

export type ApplyLabelInput = InferOutput<typeof ApplyLabelSchema>;

export const RemoveLabelSchema = object({
  entityId: pipe(string(), minLength(1, "entityId is required")),
  entityType: pipe(string(), minLength(1, "entityType is required")),
  labelId: pipe(string(), minLength(1, "labelId is required")),
});

export type RemoveLabelInput = InferOutput<typeof RemoveLabelSchema>;
