import { CompressionModeSchema } from "#/schemas/enums";
import { FileNameSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  integer,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  record,
  string,
  unknown,
} from "valibot";
import type { InferOutput } from "valibot";

export const CompressionOptionSchema = object({
  enabled: optional(boolean(), true),
  format: optional(string()),
  mode: CompressionModeSchema,
  quality: optional(number()),
});

export type CompressionOption = InferOutput<typeof CompressionOptionSchema>;

export const MetadataSchema = record(string(), unknown());

export const UploadFileSchema = object({
  batchId: optional(string()),
  body: unknown(),
  compression: optional(CompressionOptionSchema),
  contentType: pipe(string(), minLength(1, "Content type is required")),
  description: optional(nullable(string())),
  folderId: optional(nullable(string())),
  labelIds: optional(array(pipe(string(), minLength(1, "labelId is required")))),
  metadata: optional(record(string(), unknown())),
  name: FileNameSchema,
  ownerId: string(),
  uploadedBy: optional(string()),
});

export type UploadFileInput = InferOutput<typeof UploadFileSchema>;

export const UploadBulkSchema = object({
  inputs: array(UploadFileSchema),
});

export type UploadBulkInput = InferOutput<typeof UploadBulkSchema>;

export const UpdateFileSchema = object({
  body: optional(unknown()),
  compression: optional(CompressionOptionSchema),
  contentType: optional(string()),
  description: optional(nullable(string())),
  metadata: optional(record(string(), unknown())),
  name: optional(FileNameSchema),
  uploadedBy: optional(string()),
});

export type UpdateFileInput = InferOutput<typeof UpdateFileSchema>;

export const AddMetadataSchema = object({
  key: pipe(string(), minLength(1, "Metadata key is required")),
  value: unknown(),
});

export type AddMetadataInput = InferOutput<typeof AddMetadataSchema>;

export const RemoveMetadataSchema = object({
  key: pipe(string(), minLength(1, "Metadata key is required")),
});

export type RemoveMetadataInput = InferOutput<typeof RemoveMetadataSchema>;

export const RenameFileSchema = object({
  name: FileNameSchema,
});

export type RenameFileInput = InferOutput<typeof RenameFileSchema>;

export const MoveFileSchema = object({
  newFolderId: optional(nullable(string())),
});

export type MoveFileInput = InferOutput<typeof MoveFileSchema>;

export const ClassifyFileSchema = object({
  classId: pipe(string(), minLength(1, "classId is required")),
  fieldValues: optional(record(string(), unknown())),
});

export type ClassifyFileInput = InferOutput<typeof ClassifyFileSchema>;

export const NewVersionSchema = object({
  body: unknown(),
  compression: optional(CompressionOptionSchema),
  contentType: optional(string()),
  name: optional(FileNameSchema),
  uploadedBy: optional(string()),
});

export type NewVersionInput = InferOutput<typeof NewVersionSchema>;

export const DownloadOptionsSchema = object({
  expiresIn: optional(number(), 3600),
});

export type DownloadOptions = InferOutput<typeof DownloadOptionsSchema>;

export const FolderDownloadLinkOptionsSchema = object({
  expiresIn: optional(number(), 3600),
  includeSubfolders: optional(boolean(), true),
});

export type FolderDownloadLinkOptions = InferOutput<typeof FolderDownloadLinkOptionsSchema>;

export const TriageFiltersSchema = object({
  batchId: optional(string()),
  classId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  ownerId: optional(string()),
  search: optional(string()),
});

export type TriageFilters = InferOutput<typeof TriageFiltersSchema>;
