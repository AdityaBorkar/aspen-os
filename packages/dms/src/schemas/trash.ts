import { boolean, number, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const ListTrashOptionsSchema = object({
  classId: optional(string()),
  deletedBy: optional(string()),
  held: optional(boolean()),
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  ownerId: optional(string()),
  search: optional(string()),
  status: optional(string()),
});

export type ListTrashOptions = InferOutput<typeof ListTrashOptionsSchema>;

export const EmptyTrashOptionsSchema = object({
  ownerId: optional(string()),
});

export type EmptyTrashOptions = InferOutput<typeof EmptyTrashOptionsSchema>;
