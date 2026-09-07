import { ProjectMemberRoleSchema, StatusCategorySchema } from "#/schemas/enums";
import { HexColorSchema, IdSchema, IntSchema, NameSchema } from "#/schemas/utils";

import { boolean, nullable, object, omit, optional, partial } from "valibot";
import type { InferOutput } from "valibot";

export const CreateStatusSchema = object({
  category: StatusCategorySchema,
  color: optional(nullable(HexColorSchema)),
  isDefault: optional(boolean()),
  isResolved: optional(boolean()),
  name: NameSchema,
  projectId: optional(nullable(IdSchema)),
  sortOrder: optional(IntSchema),
});

export type CreateStatusInput = InferOutput<typeof CreateStatusSchema>;

export const UpdateStatusSchema = partial(omit(CreateStatusSchema, ["projectId"]));

export type UpdateStatusInput = InferOutput<typeof UpdateStatusSchema>;

export const CreateStatusTransitionSchema = object({
  fromStatusId: IdSchema,
  projectId: IdSchema,
  requiresComment: optional(boolean()),
  requiresRole: optional(nullable(ProjectMemberRoleSchema)),
  toStatusId: IdSchema,
});

export type CreateStatusTransitionInput = InferOutput<typeof CreateStatusTransitionSchema>;
