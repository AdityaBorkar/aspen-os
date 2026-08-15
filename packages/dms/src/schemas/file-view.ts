import { NameSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  check,
  maxLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
  unknown,
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

export const FileViewConditionSchema = object({
  field: FieldSchema,
  operator: OperatorSchema,
  value: optional(unknown()),
});

export type FileViewCondition = InferOutput<typeof FileViewConditionSchema>;

export const FileViewSortSchema = object({
  direction: DirectionSchema,
  field: FieldSchema,
});

export type FileViewSort = InferOutput<typeof FileViewSortSchema>;

export const CreateFileViewSchema = object({
  filters: optional(array(FileViewConditionSchema), []),
  isDefault: optional(boolean(), false),
  isShared: optional(boolean(), false),
  name: NameSchema,
  ownerId: string(),
  sort: optional(array(FileViewSortSchema), []),
});

export type CreateFileViewInput = InferOutput<typeof CreateFileViewSchema>;

export const UpdateFileViewSchema = object({
  filters: optional(array(FileViewConditionSchema)),
  isDefault: optional(boolean()),
  isShared: optional(boolean()),
  name: optional(NameSchema),
  sort: optional(array(FileViewSortSchema)),
});

export type UpdateFileViewInput = InferOutput<typeof UpdateFileViewSchema>;

export const ApplyFileViewSchema = object({
  filters: optional(array(FileViewConditionSchema)),
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  sort: optional(array(FileViewSortSchema)),
  viewId: optional(nullable(string())),
});

export type ApplyFileViewInput = InferOutput<typeof ApplyFileViewSchema>;
