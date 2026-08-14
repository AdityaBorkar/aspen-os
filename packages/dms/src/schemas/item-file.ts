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

import { ItemNameSchema } from "./item-utils";

export const UploadItemFileSchema = object({
  body: unknown(),
  contentType: pipe(string(), minLength(1, "Content type is required")),
  description: optional(nullable(string())),
  folderId: optional(nullable(string())),
  name: ItemNameSchema,
  ownerId: pipe(string(), minLength(1, "ownerId is required")),
});

export type UploadItemFileInput = InferOutput<typeof UploadItemFileSchema>;

export const UpdateItemFileSchema = object({
  body: unknown(),
  contentType: optional(string()),
  description: optional(nullable(string())),
  uploadedBy: pipe(string(), minLength(1, "uploadedBy is required")),
});

export type UpdateItemFileInput = InferOutput<typeof UpdateItemFileSchema>;

export const RenameItemFileSchema = object({
  name: ItemNameSchema,
});

export type RenameItemFileInput = InferOutput<typeof RenameItemFileSchema>;

export const MoveItemFileSchema = object({
  newFolderId: optional(nullable(string())),
});

export type MoveItemFileInput = InferOutput<typeof MoveItemFileSchema>;

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
