import {
  array,
  boolean,
  check,
  type InferOutput,
  integer,
  maxLength,
  nullable,
  object,
  optional,
  pipe,
  string,
  number as valibotNumber,
} from "valibot";

import { FieldTypeSchema } from "./enums";
import { NameSchema } from "./utils";

export const FileNamingSchema = pipe(
  string(),
  maxLength(500, "File naming schema must be at most 500 characters"),
);

export const FieldKeySchema = pipe(
  string(),
  maxLength(100, "Field name must be at most 100 characters"),
  check((val) => val.length > 0, "Field name is required"),
);

export const LabelSchema = pipe(
  string(),
  maxLength(100, "Label must be at most 100 characters"),
  check((val) => val.length > 0, "Label is required"),
);

export const CreateDocumentClassSchema = object({
  color: optional(nullable(string())),
  createdBy: string(),
  description: optional(nullable(string())),
  fileNamingSchema: optional(nullable(FileNamingSchema)),
  icon: optional(nullable(string())),
  name: NameSchema,
  retentionDays: optional(nullable(pipe(valibotNumber(), integer()))),
});

export type CreateDocumentClassInput = InferOutput<typeof CreateDocumentClassSchema>;

export const UpdateDocumentClassSchema = object({
  color: optional(nullable(string())),
  description: optional(nullable(string())),
  fileNamingSchema: optional(nullable(FileNamingSchema)),
  icon: optional(nullable(string())),
  name: optional(NameSchema),
  retentionDays: optional(nullable(pipe(valibotNumber(), integer()))),
});

export type UpdateDocumentClassInput = InferOutput<typeof UpdateDocumentClassSchema>;

export const ClassFiltersSchema = object({
  activeOnly: optional(boolean()),
  search: optional(string()),
});

export type ClassFilters = InferOutput<typeof ClassFiltersSchema>;

export const CreateClassFieldSchema = object({
  classId: string(),
  defaultValue: optional(nullable(string())),
  includeInSearch: optional(boolean(), true),
  isRequired: optional(boolean(), false),
  label: LabelSchema,
  name: FieldKeySchema,
  options: optional(nullable(array(string()))),
  sortOrder: optional(pipe(valibotNumber(), integer()), 0),
  type: FieldTypeSchema,
});

export type CreateClassFieldInput = InferOutput<typeof CreateClassFieldSchema>;

export const UpdateClassFieldSchema = object({
  defaultValue: optional(nullable(string())),
  includeInSearch: optional(boolean()),
  isRequired: optional(boolean()),
  label: optional(LabelSchema),
  options: optional(nullable(array(string()))),
  sortOrder: optional(pipe(valibotNumber(), integer())),
});

export type UpdateClassFieldInput = InferOutput<typeof UpdateClassFieldSchema>;

export const ArchiveClassSchema = object({
  classId: string(),
});

export type ArchiveClassInput = InferOutput<typeof ArchiveClassSchema>;
