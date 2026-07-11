import {
  type InferOutput,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { DriveSortOrderSchema } from "./enums";
import { HexColorSchema, ItemNameSchema } from "./utils";

export const CreateFolderSchema = object({
  color: optional(nullable(HexColorSchema)),
  description: optional(nullable(string())),
  name: ItemNameSchema,
  ownerId: pipe(string(), minLength(1, "ownerId is required")),
  parentId: optional(nullable(string())),
});

export type CreateFolderInput = InferOutput<typeof CreateFolderSchema>;

export const RenameFolderSchema = object({
  name: ItemNameSchema,
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
  sortOrder: optional(DriveSortOrderSchema, "asc"),
});

export type ListFolderOptions = InferOutput<typeof ListFolderOptionsSchema>;
