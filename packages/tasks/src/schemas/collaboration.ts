import { IdSchema } from "#/schemas/utils";

import { nullable, object, optional } from "valibot";
import type { InferOutput } from "valibot";

export const CreateAttachmentSchema = object({
  commentId: optional(nullable(IdSchema)),
  fileId: IdSchema,
  taskId: IdSchema,
  uploadedBy: IdSchema,
});

export type CreateAttachmentInput = InferOutput<typeof CreateAttachmentSchema>;

export const CreateWatcherSchema = object({
  taskId: IdSchema,
  userId: IdSchema,
});

export type CreateWatcherInput = InferOutput<typeof CreateWatcherSchema>;
