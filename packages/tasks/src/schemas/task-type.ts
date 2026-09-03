import { HexColorSchema, IdSchema, NameSchema } from "#/schemas/utils";

import { boolean, nullable, object, omit, optional, partial, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateTaskTypeSchema = object({
  color: optional(nullable(HexColorSchema)),
  icon: optional(nullable(string())),
  isDefault: optional(boolean()),
  name: NameSchema,
  projectId: optional(nullable(IdSchema)),
});

export type CreateTaskTypeInput = InferOutput<typeof CreateTaskTypeSchema>;

export const UpdateTaskTypeSchema = partial(omit(CreateTaskTypeSchema, ["projectId"]));

export type UpdateTaskTypeInput = InferOutput<typeof UpdateTaskTypeSchema>;

export const CreateLabelSchema = object({
  color: optional(nullable(HexColorSchema)),
  name: NameSchema,
  projectId: optional(nullable(IdSchema)),
});

export type CreateLabelInput = InferOutput<typeof CreateLabelSchema>;

export const UpdateLabelSchema = partial(omit(CreateLabelSchema, ["projectId"]));

export type UpdateLabelInput = InferOutput<typeof UpdateLabelSchema>;
