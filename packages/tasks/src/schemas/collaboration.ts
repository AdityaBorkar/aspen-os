import { SavedViewTypeSchema } from "#/schemas/enums";
import { IdSchema, NameSchema } from "#/schemas/utils";

import { JsonValueSchema } from "@aspen-os/platform/server";
import { boolean, nullable, object, omit, optional, partial, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateAttachmentSchema = object({
  commentId: optional(nullable(IdSchema)),
  fileId: IdSchema,
  taskId: IdSchema,
  uploadedBy: IdSchema,
});

export type CreateAttachmentInput = InferOutput<typeof CreateAttachmentSchema>;

export const CreateWatcherSchema = object({
  taskId: IdSchema,
  userId: IdSchema,
});

export type CreateWatcherInput = InferOutput<typeof CreateWatcherSchema>;

export const CreateSavedViewSchema = object({
  filters: optional(nullable(JsonValueSchema)),
  groupBy: optional(nullable(string())),
  isDefault: optional(boolean()),
  isShared: optional(boolean()),
  name: NameSchema,
  ownerId: IdSchema,
  projectId: optional(nullable(IdSchema)),
  sort: optional(nullable(JsonValueSchema)),
  type: optional(SavedViewTypeSchema),
});

export type CreateSavedViewInput = InferOutput<typeof CreateSavedViewSchema>;

export const UpdateSavedViewSchema = partial(omit(CreateSavedViewSchema, ["ownerId", "projectId"]));

export type UpdateSavedViewInput = InferOutput<typeof UpdateSavedViewSchema>;
