import { MasterEntityTypeSchema, NoteTypeSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { minLength, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateNoteSchema = object({
  content: pipe(string(), minLength(1, "Content is required")),
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  type: NoteTypeSchema,
  userId: pipe(string(), minLength(1, "userId is required")),
});

export type CreateNoteInput = InferOutput<typeof CreateNoteSchema>;

export const ListNotesSchema = object({
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  type: optional(NoteTypeSchema),
});

export type ListNotesInput = InferOutput<typeof ListNotesSchema>;
