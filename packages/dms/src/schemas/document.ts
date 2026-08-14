import {
  array,
  boolean,
  type InferOutput,
  integer,
  minLength,
  object,
  optional,
  pipe,
  record,
  string,
  unknown,
  number as valibotNumber,
} from "valibot";

import { CompressionModeSchema } from "./enums";
import { FileNameSchema } from "./utils";

export const CompressionOptionSchema = object({
  enabled: optional(boolean(), true),
  format: optional(string()),
  mode: CompressionModeSchema,
  quality: optional(valibotNumber()),
});

export type CompressionOption = InferOutput<typeof CompressionOptionSchema>;

export const TagInputSchema = pipe(string(), minLength(1, "Tag name is required"));

export const MetadataSchema = record(string(), unknown());

export const UploadDocumentSchema = object({
  batchId: optional(string()),
  body: unknown(),
  compression: optional(CompressionOptionSchema),
  contentType: pipe(string(), minLength(1, "Content type is required")),
  metadata: optional(record(string(), unknown())),
  name: FileNameSchema,
  ownerId: string(),
  tags: optional(array(TagInputSchema)),
  uploadedBy: optional(string()),
});

export type UploadDocumentInput = InferOutput<typeof UploadDocumentSchema>;

export const UploadBulkSchema = object({
  inputs: array(UploadDocumentSchema),
});

export type UploadBulkInput = InferOutput<typeof UploadBulkSchema>;

export const UpdateDocumentSchema = object({
  compression: optional(CompressionOptionSchema),
  metadata: optional(record(string(), unknown())),
  name: optional(FileNameSchema),
  tags: optional(array(TagInputSchema)),
});

export type UpdateDocumentInput = InferOutput<typeof UpdateDocumentSchema>;

export const AddMetadataSchema = object({
  key: pipe(string(), minLength(1, "Metadata key is required")),
  value: unknown(),
});

export type AddMetadataInput = InferOutput<typeof AddMetadataSchema>;

export const TagDocumentSchema = object({
  tag: TagInputSchema,
});

export type TagDocumentInput = InferOutput<typeof TagDocumentSchema>;

export const RemoveMetadataSchema = object({
  key: pipe(string(), minLength(1, "Metadata key is required")),
});

export type RemoveMetadataInput = InferOutput<typeof RemoveMetadataSchema>;

export const ClassifyDocumentSchema = object({
  classId: pipe(string(), minLength(1, "classId is required")),
  fieldValues: optional(record(string(), unknown())),
});

export type ClassifyDocumentInput = InferOutput<typeof ClassifyDocumentSchema>;

export const NewVersionSchema = object({
  body: unknown(),
  compression: optional(CompressionOptionSchema),
  contentType: optional(string()),
  name: optional(FileNameSchema),
  uploadedBy: optional(string()),
});

export type NewVersionInput = InferOutput<typeof NewVersionSchema>;

export const DownloadOptionsSchema = object({
  expiresIn: optional(valibotNumber()),
});

export type DownloadOptions = InferOutput<typeof DownloadOptionsSchema>;

export const TriageFiltersSchema = object({
  batchId: optional(string()),
  classId: optional(string()),
  limit: optional(pipe(valibotNumber(), integer())),
  offset: optional(pipe(valibotNumber(), integer())),
  ownerId: optional(string()),
  search: optional(string()),
  tag: optional(string()),
});

export type TriageFilters = InferOutput<typeof TriageFiltersSchema>;
