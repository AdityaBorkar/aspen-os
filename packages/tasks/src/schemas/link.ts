import { type InferOutput, minLength, object, pipe, string } from "valibot";

import { TaskLinkTypeSchema } from "./enums";

export const CreateTaskLinkSchema = object({
  linkType: TaskLinkTypeSchema,
  sourceId: pipe(string(), minLength(1, "sourceId is required")),
  targetId: pipe(string(), minLength(1, "targetId is required")),
});

export type CreateTaskLinkInput = InferOutput<typeof CreateTaskLinkSchema>;
