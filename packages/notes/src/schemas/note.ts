import { NotesAccessSchema, NoteTypeSchema } from "#/schemas/enums";
import { JsonValueSchema } from "#/schemas/json";
import { IdSchema, ScopeTypeSchema } from "#/schemas/utils";

import {
  array,
  integer,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  record,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateNoteSchema = object({
  access: optional(NotesAccessSchema, "personal"),
  body: pipe(string(), minLength(1, "Body is required")),
  metadata: optional(record(string(), JsonValueSchema)),
  ownerId: optional(IdSchema),
  scopeId: optional(nullable(IdSchema)),
  scopeType: optional(nullable(ScopeTypeSchema)),
  tags: optional(array(string()), []),
  title: optional(nullable(string())),
  type: optional(NoteTypeSchema, "general"),
});

export type CreateNoteInput = InferOutput<typeof CreateNoteSchema>;

export const UpdateNoteSchema = object({
  access: optional(NotesAccessSchema),
  body: optional(pipe(string(), minLength(1, "Body is required"))),
  metadata: optional(record(string(), JsonValueSchema)),
  scopeId: optional(nullable(IdSchema)),
  scopeType: optional(nullable(ScopeTypeSchema)),
  tags: optional(array(string())),
  title: optional(nullable(string())),
  type: optional(NoteTypeSchema),
});

export type UpdateNoteInput = InferOutput<typeof UpdateNoteSchema>;

export const NoteFiltersSchema = object({
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  scopeId: optional(string()),
  scopeType: optional(string()),
  search: optional(string()),
  tags: optional(array(string())),
  type: optional(NoteTypeSchema),
});

export type NoteFilters = InferOutput<typeof NoteFiltersSchema>;
