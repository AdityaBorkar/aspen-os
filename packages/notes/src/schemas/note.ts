import { NotesAccessSchema, NoteTypeSchema } from "#/schemas/enums";

import { IdSchema, JsonValueSchema, ScopeTypeSchema } from "@aspen-os/platform/server";
import {
  array,
  check,
  integer,
  maxLength,
  maxValue,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  record,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const MAX_BODY_LENGTH = 50_000;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 200;
const MAX_TAG_LENGTH = 64;
const MAX_TAGS = 20;
const MAX_TITLE_LENGTH = 255;

const DEFAULT_LIMIT = 50;

const SCOPE_PAIR_MESSAGE = "scopeType and scopeId must be provided together";

function isUnset(value: string | null | undefined): boolean {
  return value === undefined || value === null;
}

const TagSchema = pipe(
  string(),
  minLength(1, "Tag must not be empty"),
  maxLength(MAX_TAG_LENGTH, `Tag must be at most ${MAX_TAG_LENGTH} characters`),
);

const TagsSchema = pipe(array(TagSchema), maxLength(MAX_TAGS, `At most ${MAX_TAGS} tags`));

const BodySchema = pipe(
  string(),
  minLength(1, "Body is required"),
  check((value) => value.trim() !== "", "Body must not be blank"),
  maxLength(MAX_BODY_LENGTH, `Body must be at most ${MAX_BODY_LENGTH} characters`),
);

const TitleSchema = pipe(
  string(),
  maxLength(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`),
);

const CreateNoteObject = object({
  access: optional(NotesAccessSchema, "personal"),
  body: BodySchema,
  metadata: optional(record(string(), JsonValueSchema)),
  ownerId: optional(IdSchema),
  scopeId: optional(nullable(IdSchema)),
  scopeType: optional(nullable(ScopeTypeSchema)),
  tags: optional(TagsSchema, []),
  title: optional(nullable(TitleSchema)),
  type: optional(NoteTypeSchema, "general"),
});

export const CreateNoteSchema = pipe(
  CreateNoteObject,
  check(
    (value: InferOutput<typeof CreateNoteObject>) =>
      isUnset(value.scopeType) === isUnset(value.scopeId),
    SCOPE_PAIR_MESSAGE,
  ),
);

export type CreateNoteInput = InferOutput<typeof CreateNoteSchema>;

const UpdateNoteObject = object({
  access: optional(NotesAccessSchema),
  body: optional(BodySchema),
  metadata: optional(record(string(), JsonValueSchema)),
  scopeId: optional(nullable(IdSchema)),
  scopeType: optional(nullable(ScopeTypeSchema)),
  tags: optional(TagsSchema),
  title: optional(nullable(TitleSchema)),
  type: optional(NoteTypeSchema),
});

export const UpdateNoteSchema = pipe(
  UpdateNoteObject,
  check(
    (value: InferOutput<typeof UpdateNoteObject>) =>
      isUnset(value.scopeType) === isUnset(value.scopeId),
    SCOPE_PAIR_MESSAGE,
  ),
);

export type UpdateNoteInput = InferOutput<typeof UpdateNoteSchema>;

const NoteFiltersObject = object({
  limit: optional(
    pipe(
      number(),
      integer(),
      minValue(1, "Limit must be at least 1"),
      maxValue(MAX_LIMIT, `Limit must be at most ${MAX_LIMIT}`),
    ),
    DEFAULT_LIMIT,
  ),
  offset: optional(pipe(number(), integer(), minValue(0, "Offset must be at least 0")), 0),
  scopeId: optional(string()),
  scopeType: optional(string()),
  search: optional(
    pipe(
      string(),
      maxLength(MAX_SEARCH_LENGTH, `Search must be at most ${MAX_SEARCH_LENGTH} characters`),
    ),
  ),
  tags: optional(array(TagSchema)),
  type: optional(NoteTypeSchema),
});

export const NoteFiltersSchema = pipe(
  NoteFiltersObject,
  check(
    (value: InferOutput<typeof NoteFiltersObject>) =>
      isUnset(value.scopeType) === isUnset(value.scopeId),
    SCOPE_PAIR_MESSAGE,
  ),
);

export type NoteFilters = InferOutput<typeof NoteFiltersSchema>;
