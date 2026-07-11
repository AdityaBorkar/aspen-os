import {
  type InferOutput,
  minLength,
  nullable,
  object,
  optional,
  pipe,
  string,
} from "valibot";

export const CreateCommentSchema = object({
  body: pipe(string(), minLength(1, "Comment body is required")),
  parentId: optional(nullable(string())),
  taskId: pipe(string(), minLength(1, "taskId is required")),
  userId: pipe(string(), minLength(1, "userId is required")),
});

export type CreateCommentInput = InferOutput<typeof CreateCommentSchema>;

export const UpdateCommentSchema = object({
  body: optional(pipe(string(), minLength(1, "Comment body cannot be empty"))),
});

export type UpdateCommentInput = InferOutput<typeof UpdateCommentSchema>;
