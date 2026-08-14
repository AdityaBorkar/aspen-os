import { type InferOutput, number, object, optional, string } from "valibot";

export const ListTrashOptionsSchema = object({
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  ownerId: optional(string()),
});

export type ListTrashOptions = InferOutput<typeof ListTrashOptionsSchema>;

export const EmptyTrashOptionsSchema = object({
  ownerId: optional(string()),
});

export type EmptyTrashOptions = InferOutput<typeof EmptyTrashOptionsSchema>;
