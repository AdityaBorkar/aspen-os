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

import { NameSchema } from "./utils";

export const CreateAttachmentSchema = object({
  commentId: optional(nullable(string())),
  fileId: pipe(string(), minLength(1, "fileId is required")),
  taskId: pipe(string(), minLength(1, "taskId is required")),
  uploadedBy: pipe(string(), minLength(1, "uploadedBy is required")),
});

export type CreateAttachmentInput = InferOutput<typeof CreateAttachmentSchema>;

export const CreateWatcherSchema = object({
  taskId: pipe(string(), minLength(1, "taskId is required")),
  userId: pipe(string(), minLength(1, "userId is required")),
});

export type CreateWatcherInput = InferOutput<typeof CreateWatcherSchema>;

export const CreateSavedViewSchema = object({
  filters: optional(nullable(object({}))),
  groupBy: optional(nullable(string())),
  isDefault: optional(boolean()),
  isShared: optional(boolean()),
  name: NameSchema,
  ownerId: pipe(string(), minLength(1, "ownerId is required")),
  projectId: optional(nullable(string())),
  sort: optional(nullable(object({}))),
  type: optional(string()),
});

export type CreateSavedViewInput = InferOutput<typeof CreateSavedViewSchema>;

export const UpdateSavedViewSchema = object({
  filters: optional(nullable(object({}))),
  groupBy: optional(nullable(string())),
  isDefault: optional(boolean()),
  isShared: optional(boolean()),
  name: optional(NameSchema),
  sort: optional(nullable(object({}))),
  type: optional(string()),
});

export type UpdateSavedViewInput = InferOutput<typeof UpdateSavedViewSchema>;
