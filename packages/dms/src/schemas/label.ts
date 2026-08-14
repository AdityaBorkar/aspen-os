import {
  boolean,
  type InferOutput,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { EntityTypeSchema } from "./enums";
import { HexColorSchema, LabelNameSchema } from "./utils";

export const CreateLabelSchema = object({
  color: HexColorSchema,
  isGlobal: optional(boolean(), false),
  name: LabelNameSchema,
  ownerId: optional(nullable(string())),
});

export type CreateLabelInput = InferOutput<typeof CreateLabelSchema>;

export const UpdateLabelSchema = object({
  color: optional(HexColorSchema),
  isGlobal: optional(boolean()),
  name: optional(LabelNameSchema),
  ownerId: optional(nullable(string())),
});

export type UpdateLabelInput = InferOutput<typeof UpdateLabelSchema>;

export const ApplyLabelSchema = object({
  appliedBy: pipe(string(), minLength(1, "appliedBy is required")),
  entityId: pipe(string(), minLength(1, "entityId is required")),
  entityType: EntityTypeSchema,
  labelId: pipe(string(), minLength(1, "labelId is required")),
});

export type ApplyLabelInput = InferOutput<typeof ApplyLabelSchema>;

export const ListLabelsOptionsSchema = object({
  includeGlobal: optional(boolean(), true),
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  ownerId: optional(string()),
});

export type ListLabelsOptions = InferOutput<typeof ListLabelsOptionsSchema>;

export const ListByLabelOptionsSchema = object({
  limit: optional(number(), 50),
  offset: optional(number(), 0),
});

export type ListByLabelOptions = InferOutput<typeof ListByLabelOptionsSchema>;
