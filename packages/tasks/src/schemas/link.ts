import { TaskLinkTypeSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { object } from "valibot";
import type { InferOutput } from "valibot";

export const CreateTaskLinkSchema = object({
  linkType: TaskLinkTypeSchema,
  sourceId: IdSchema,
  targetId: IdSchema,
});

export type CreateTaskLinkInput = InferOutput<typeof CreateTaskLinkSchema>;
