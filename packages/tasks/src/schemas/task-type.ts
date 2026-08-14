import {
  boolean,
  type InferOutput,
  minLength,
  nullable,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { HexColorSchema, NameSchema } from "./utils";

export const CreateTaskTypeSchema = object({
  color: optional(nullable(HexColorSchema)),
  icon: optional(nullable(string())),
  isDefault: optional(boolean()),
  name: NameSchema,
  projectId: optional(nullable(string())),
});

export type CreateTaskTypeInput = InferOutput<typeof CreateTaskTypeSchema>;

export const UpdateTaskTypeSchema = object({
  color: optional(nullable(HexColorSchema)),
  icon: optional(nullable(string())),
  isDefault: optional(boolean()),
  name: optional(NameSchema),
});

export type UpdateTaskTypeInput = InferOutput<typeof UpdateTaskTypeSchema>;

export const CreateLabelSchema = object({
  color: optional(nullable(HexColorSchema)),
  name: pipe(string(), minLength(1, "Label name is required")),
  projectId: optional(nullable(string())),
});

export type CreateLabelInput = InferOutput<typeof CreateLabelSchema>;

export const UpdateLabelSchema = object({
  color: optional(nullable(HexColorSchema)),
  name: optional(string()),
});

export type UpdateLabelInput = InferOutput<typeof UpdateLabelSchema>;
