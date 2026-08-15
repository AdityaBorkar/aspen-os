import { SearchSortOrderSchema } from "#/schemas/search";
import { HexColorSchema, FileNameSchema } from "#/schemas/utils";

import { minLength, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateFolderSchema = object({
  color: optional(nullable(HexColorSchema)),
  description: optional(nullable(string())),
  name: FileNameSchema,
  ownerId: pipe(string(), minLength(1, "ownerId is required")),
  parentId: optional(nullable(string())),
});

export type CreateFolderInput = InferOutput<typeof CreateFolderSchema>;

export const RenameFolderSchema = object({
  name: FileNameSchema,
});

export type RenameFolderInput = InferOutput<typeof RenameFolderSchema>;

export const MoveFolderSchema = object({
  newParentId: optional(nullable(string())),
});

export type MoveFolderInput = InferOutput<typeof MoveFolderSchema>;

export const UpdateFolderSchema = object({
  color: optional(nullable(HexColorSchema)),
  description: optional(nullable(string())),
});

export type UpdateFolderInput = InferOutput<typeof UpdateFolderSchema>;

export const ListFolderOptionsSchema = object({
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  search: optional(string()),
  sortBy: optional(string(), "name"),
  sortOrder: optional(SearchSortOrderSchema, "asc"),
});

export type ListFolderOptions = InferOutput<typeof ListFolderOptionsSchema>;
