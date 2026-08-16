import { DraftStatusSchema, WorkspaceAccessSchema } from "#/schemas/enums";
import { JsonValueSchema } from "#/schemas/json";
import { IdSchema, TitleSchema } from "#/schemas/utils";

import {
  boolean,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  record,
  string,
  integer,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateDraftSchema = object({
  access: optional(WorkspaceAccessSchema, "personal"),
  body: optional(string(), ""),
  metadata: optional(record(string(), JsonValueSchema)),
  notes: optional(nullable(string())),
  ownerId: optional(string()),
  targetDomain: optional(nullable(string())),
  targetEntityId: optional(nullable(string())),
  targetEntityType: optional(nullable(string())),
  title: TitleSchema,
});

export type CreateDraftInput = InferOutput<typeof CreateDraftSchema>;

export const UpdateDraftSchema = object({
  access: optional(WorkspaceAccessSchema),
  body: optional(string()),
  metadata: optional(record(string(), JsonValueSchema)),
  notes: optional(nullable(string())),
  targetDomain: optional(nullable(string())),
  targetEntityId: optional(nullable(string())),
  targetEntityType: optional(nullable(string())),
  title: optional(TitleSchema),
});

export type UpdateDraftInput = InferOutput<typeof UpdateDraftSchema>;

export const DraftFiltersSchema = object({
  includeTrashed: optional(boolean(), false),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  search: optional(string()),
  status: optional(DraftStatusSchema),
  targetDomain: optional(string()),
});

export type DraftFilters = InferOutput<typeof DraftFiltersSchema>;

export const RejectDraftSchema = object({
  id: IdSchema,
  rejectionReason: pipe(string(), minLength(1, "Rejection reason is required")),
});

export type RejectDraftInput = InferOutput<typeof RejectDraftSchema>;

export const PublishDraftSchema = object({
  id: IdSchema,
  targetDomain: optional(nullable(string())),
  targetEntityId: optional(nullable(string())),
  targetEntityType: optional(nullable(string())),
});

export type PublishDraftInput = InferOutput<typeof PublishDraftSchema>;

export const CreateDraftCommentSchema = object({
  content: pipe(string(), minLength(1, "Comment content is required")),
  draftId: IdSchema,
});

export type CreateDraftCommentInput = InferOutput<typeof CreateDraftCommentSchema>;

export const ListDraftCommentsSchema = object({
  draftId: IdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export type ListDraftCommentsInput = InferOutput<typeof ListDraftCommentsSchema>;
