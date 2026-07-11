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
  unknown,
} from "valibot";

import { ItemNameSchema } from "./utils";

export const UploadFileSchema = object({
  body: unknown(),
  contentType: pipe(string(), minLength(1, "Content type is required")),
  description: optional(nullable(string())),
  folderId: optional(nullable(string())),
  name: ItemNameSchema,
  ownerId: pipe(string(), minLength(1, "ownerId is required")),
});

export type UploadFileInput = InferOutput<typeof UploadFileSchema>;

export const UpdateFileSchema = object({
  body: unknown(),
  contentType: optional(string()),
  description: optional(nullable(string())),
  uploadedBy: pipe(string(), minLength(1, "uploadedBy is required")),
});

export type UpdateFileInput = InferOutput<typeof UpdateFileSchema>;

export const RenameFileSchema = object({
  name: ItemNameSchema,
});

export type RenameFileInput = InferOutput<typeof RenameFileSchema>;

export const MoveFileSchema = object({
  newFolderId: optional(nullable(string())),
});

export type MoveFileInput = InferOutput<typeof MoveFileSchema>;

export const DownloadLinkOptionsSchema = object({
  expiresIn: optional(number(), 3600),
});

export type DownloadLinkOptions = InferOutput<typeof DownloadLinkOptionsSchema>;

export const FolderDownloadLinkOptionsSchema = object({
  expiresIn: optional(number(), 3600),
  includeSubfolders: optional(boolean(), true),
});

export type FolderDownloadLinkOptions = InferOutput<
  typeof FolderDownloadLinkOptionsSchema
>;
