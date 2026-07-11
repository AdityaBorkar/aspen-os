import {
  boolean,
  type InferOutput,
  integer,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { StatusCategorySchema } from "./enums";
import { HexColorSchema, NameSchema } from "./utils";

export const CreateStatusSchema = object({
  category: StatusCategorySchema,
  color: optional(nullable(HexColorSchema)),
  isDefault: optional(boolean()),
  isResolved: optional(boolean()),
  name: NameSchema,
  projectId: optional(nullable(string())),
  sortOrder: optional(pipe(number(), integer())),
});

export type CreateStatusInput = InferOutput<typeof CreateStatusSchema>;

export const UpdateStatusSchema = object({
  category: optional(StatusCategorySchema),
  color: optional(nullable(HexColorSchema)),
  isDefault: optional(boolean()),
  isResolved: optional(boolean()),
  name: optional(NameSchema),
  sortOrder: optional(pipe(number(), integer())),
});

export type UpdateStatusInput = InferOutput<typeof UpdateStatusSchema>;

export const CreateStatusTransitionSchema = object({
  fromStatusId: pipe(string(), minLength(1, "fromStatusId is required")),
  projectId: pipe(string(), minLength(1, "projectId is required")),
  requiresComment: optional(boolean()),
  requiresRole: optional(nullable(string())),
  toStatusId: pipe(string(), minLength(1, "toStatusId is required")),
});

export type CreateStatusTransitionInput = InferOutput<
  typeof CreateStatusTransitionSchema
>;
